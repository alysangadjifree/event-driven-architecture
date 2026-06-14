/**
 * State in-memory untuk Backend API.
 * Menyimpan ringkasan metrik, recent events, dan data tren per menit.
 */

const MAX_RECENT = 50;    // jumlah event terbaru yang disimpan
const TREND_MINUTES = 30; // panjang grafik tren (menit)

const state = {
  totalClaims: 0,
  totalFraud: 0,
  totalRiskAmount: 0,     // total rupiah dari klaim yang terdeteksi fraud
  recentClaims: [],       // 50 klaim terbaru
  recentAlerts: [],       // 50 fraud alert terbaru

  // Tren per menit: array of { minute: "HH:MM", claims: N, fraud: N }
  trend: [],
  startTime: Date.now(),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function currentMinuteKey() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ensureCurrentMinuteBucket() {
  const key = currentMinuteKey();
  if (!state.trend.length || state.trend[state.trend.length - 1].minute !== key) {
    state.trend.push({ minute: key, claims: 0, fraud: 0 });
    if (state.trend.length > TREND_MINUTES) state.trend.shift();
  }
  return state.trend[state.trend.length - 1];
}

// ─── API publik ──────────────────────────────────────────────────────────────

function addClaim(claim) {
  state.totalClaims++;
  state.recentClaims.unshift(claim);
  if (state.recentClaims.length > MAX_RECENT) state.recentClaims.pop();

  const bucket = ensureCurrentMinuteBucket();
  bucket.claims++;
}

function addAlert(alert) {
  state.totalFraud++;
  state.totalRiskAmount += alert.claim_amount || 0;
  state.recentAlerts.unshift(alert);
  if (state.recentAlerts.length > MAX_RECENT) state.recentAlerts.pop();

  const bucket = ensureCurrentMinuteBucket();
  bucket.fraud++;
}

function getStats() {
  const uptimeSeconds = Math.floor((Date.now() - state.startTime) / 1000);
  const throughput = uptimeSeconds > 0
    ? (state.totalClaims / uptimeSeconds).toFixed(2)
    : "0.00";

  return {
    totalClaims: state.totalClaims,
    totalFraud: state.totalFraud,
    totalRiskAmount: state.totalRiskAmount,
    throughput: parseFloat(throughput),
    uptimeSeconds,
    trend: state.trend,
  };
}

function getRecentClaims() {
  return state.recentClaims;
}

function getRecentAlerts() {
  return state.recentAlerts;
}

module.exports = { addClaim, addAlert, getStats, getRecentClaims, getRecentAlerts };
