const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const { Kafka } = require("kafkajs");
const cors = require("cors");
const statsRouter = require("./routes/stats");
const analyticsRouter = require("./routes/analytics");
const { initDB, queryAnalytics } = require("./db/duckdb");
const { startClaimsConsumer } = require("./consumers/claimsConsumer");
const { startAlertsConsumer } = require("./consumers/alertsConsumer");

const PORT = parseInt(process.env.PORT || "3001", 10);
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

// ─── Express ─────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", statsRouter);
app.use("/api/analytics", analyticsRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─── HTTP server + WebSocket ──────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Kirim pesan ke semua WebSocket client yang terhubung
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(msg);
    }
  });
}

wss.on("connection", (ws, req) => {
  console.log(`[backend] WebSocket client terhubung (${wss.clients.size} total)`);
  ws.on("close", () => {
    console.log(`[backend] WebSocket client disconnect (${wss.clients.size} tersisa)`);
  });
});

// Push stats update setiap 1 detik ke semua client
setInterval(() => {
  const { getStats } = require("./state/statsStore");
  broadcast({ type: "stats", data: getStats() });
}, 1000);

// Push analytics dari DuckDB setiap 10 detik ke semua client
setInterval(async () => {
  try {
    const data = await queryAnalytics();
    broadcast({ type: "analytics", data });
  } catch {}
}, 10_000);

// ─── Kafka ────────────────────────────────────────────────────────────────────
const kafka = new Kafka({
  clientId: "fraud-backend",
  brokers: KAFKA_BROKERS,
  retry: { retries: 20, initialRetryTime: 3000 },
});

async function startKafka() {
  const consumer = kafka.consumer({ groupId: "backend-consumer-group" });
  await consumer.connect();

  const handleClaim = await startClaimsConsumer(consumer, broadcast);
  const handleAlert = await startAlertsConsumer(consumer, broadcast);

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      handleClaim(topic, message);
      handleAlert(topic, message);
    },
  });
}

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log(`[backend] HTTP + WebSocket server berjalan di port ${PORT}`);
  console.log(`[backend] REST API: http://localhost:${PORT}/api/stats`);
  try {
    await initDB();
  } catch (err) {
    console.error("[backend] Gagal inisialisasi DuckDB:", err.message);
    process.exit(1);
  }
  try {
    await startKafka();
  } catch (err) {
    console.error("[backend] Gagal connect ke Kafka:", err.message);
    process.exit(1);
  }
});
