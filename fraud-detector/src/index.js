const { Kafka } = require("kafkajs");
const duplicateClaim = require("./rules/duplicateClaim");
const abnormalAmount = require("./rules/abnormalAmount");
const highFrequency = require("./rules/highFrequency");
const inconsistentDiagnosis = require("./rules/inconsistentDiagnosis");
const faskesSpike = require("./rules/faskesSpike");

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const INPUT_TOPIC = "claims";
const OUTPUT_TOPIC = "fraud-alerts";

const kafka = new Kafka({
  clientId: "fraud-detector",
  brokers: KAFKA_BROKERS,
  retry: { retries: 20, initialRetryTime: 3000 },
});

const consumer = kafka.consumer({ groupId: "fraud-detector-group" });
const producer = kafka.producer();

const RULES = [duplicateClaim, abnormalAmount, highFrequency, inconsistentDiagnosis, faskesSpike];

async function start() {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: INPUT_TOPIC, fromBeginning: false });

  console.log(`[fraud-detector] Mendengarkan topik "${INPUT_TOPIC}"...`);

  let processed = 0;
  let alertsPublished = 0;

  await consumer.run({
    eachMessage: async ({ message }) => {
      let claim;
      try {
        claim = JSON.parse(message.value.toString());
      } catch {
        return;
      }

      const now = Date.now();
      const alerts = [];

      for (const rule of RULES) {
        try {
          const result = rule.check(claim, now);
          if (result) alerts.push(result);
        } catch (err) {
          console.error(`[fraud-detector] Error di rule ${rule.constructor?.name}:`, err.message);
        }
      }

      processed++;

      if (alerts.length > 0) {
        const alertEvent = {
          alert_id: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          claim_id: claim.claim_id,
          peserta_id: claim.peserta_id,
          faskes_id: claim.faskes_id,
          faskes_name: claim.faskes_name,
          diagnosis_code: claim.diagnosis_code,
          procedure_code: claim.procedure_code,
          claim_amount: claim.claim_amount,
          region: claim.region,
          alerts,
          detected_at: new Date().toISOString(),
        };

        await producer.send({
          topic: OUTPUT_TOPIC,
          messages: [{ key: claim.peserta_id, value: JSON.stringify(alertEvent) }],
        });

        alertsPublished++;
        console.log(
          `[fraud-detector] ALERT! claim=${claim.claim_id} | aturan: ${alerts.map((a) => a.rule_name).join(", ")}`
        );
      }

      if (processed % 50 === 0) {
        console.log(`[fraud-detector] Diproses: ${processed} klaim, ${alertsPublished} alerts`);
      }
    },
  });
}

start().catch((err) => {
  console.error("[fraud-detector] Fatal:", err);
  process.exit(1);
});
