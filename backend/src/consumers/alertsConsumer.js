const { addAlert } = require("../state/statsStore");

async function startAlertsConsumer(consumer, broadcast) {
  await consumer.subscribe({ topic: "fraud-alerts", fromBeginning: false });
  console.log('[backend] Subscribed ke topik "fraud-alerts"');

  return (topic, message) => {
    if (topic !== "fraud-alerts") return;
    let alert;
    try {
      alert = JSON.parse(message.value.toString());
    } catch {
      return;
    }
    addAlert(alert);
    broadcast({ type: "alert", data: alert });
  };
}

module.exports = { startAlertsConsumer };
