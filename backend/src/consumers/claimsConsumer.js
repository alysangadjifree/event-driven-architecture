const { addClaim } = require("../state/statsStore");

async function startClaimsConsumer(consumer, broadcast) {
  await consumer.subscribe({ topic: "claims", fromBeginning: false });
  console.log('[backend] Subscribed ke topik "claims"');

  // eachMessage akan di-register di index.js via consumer.run()
  // consumer yang sama dipakai untuk kedua topik, jadi kita return handler-nya saja
  return (topic, message) => {
    if (topic !== "claims") return;
    let claim;
    try {
      claim = JSON.parse(message.value.toString());
    } catch {
      return;
    }
    addClaim(claim);
    broadcast({ type: "claim", data: claim });
  };
}

module.exports = { startClaimsConsumer };
