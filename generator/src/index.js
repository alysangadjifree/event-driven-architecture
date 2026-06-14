const { Kafka } = require("kafkajs");
const { generateClaim } = require("./claimGenerator");

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const EVENTS_PER_SECOND = parseFloat(process.env.EVENTS_PER_SECOND || "2");
const TOPIC = "claims";

const kafka = new Kafka({
  clientId: "claim-generator",
  brokers: KAFKA_BROKERS,
  // Retry agresif saat Kafka belum siap saat container startup
  retry: { retries: 20, initialRetryTime: 3000 },
});

const producer = kafka.producer();

async function start() {
  await producer.connect();
  console.log(`[generator] Terhubung ke Kafka: ${KAFKA_BROKERS.join(", ")}`);
  console.log(`[generator] Rate: ${EVENTS_PER_SECOND} event/detik → topik "${TOPIC}"`);

  const intervalMs = Math.round(1000 / EVENTS_PER_SECOND);
  let sent = 0;

  setInterval(async () => {
    try {
      const claim = generateClaim();
      await producer.send({
        topic: TOPIC,
        messages: [{ key: claim.peserta_id, value: JSON.stringify(claim) }],
      });
      sent++;
      if (sent % 10 === 0) {
        console.log(`[generator] ${sent} klaim terkirim | terakhir: ${claim.claim_id} | anomali: ${claim.is_anomaly}`);
      }
    } catch (err) {
      console.error("[generator] Gagal kirim:", err.message);
    }
  }, intervalMs);
}

start().catch((err) => {
  console.error("[generator] Fatal:", err);
  process.exit(1);
});
