/**
 * Store in-memory untuk windowed state fraud detection.
 *
 * Trade-off: ringan & sederhana, tapi state hilang saat service restart.
 * Untuk produksi gunakan Redis + TTL atau RocksDB (seperti di Kafka Streams).
 */

// ─── Struktur data ─────────────────────────────────────────────────────────

// duplicate_claim: Map<"peserta|proc|date", [timestamps]>
const duplicateWindow = new Map();

// high_frequency: Map<peserta_id, [timestamps]>
const frequencyWindow = new Map();

// faskes_spike: Map<faskes_id, [timestamps]>
const faskesWindow = new Map();

// abnormal_amount: Map<procedure_code, number[]> — rolling window 500 nilai terakhir
const amountHistory = new Map();

// ─── Helpers ───────────────────────────────────────────────────────────────

function pushTimestamp(map, key, now, windowMs) {
  if (!map.has(key)) map.set(key, []);
  const arr = map.get(key);
  arr.push(now);
  // Hapus entri di luar window
  const cutoff = now - windowMs;
  while (arr.length && arr[0] < cutoff) arr.shift();
  return arr.length;
}

function getMedian(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ─── API publik ────────────────────────────────────────────────────────────

function recordAmount(procedureCode, amount) {
  if (!amountHistory.has(procedureCode)) amountHistory.set(procedureCode, []);
  const arr = amountHistory.get(procedureCode);
  arr.push(amount);
  if (arr.length > 500) arr.shift();
}

function getMedianAmount(procedureCode) {
  return getMedian(amountHistory.get(procedureCode) || []);
}

function getAmountHistoryLength(procedureCode) {
  return (amountHistory.get(procedureCode) || []).length;
}

// Kembalikan berapa kali peserta+prosedur+tanggal muncul dalam 5 menit terakhir
function countDuplicate(pesertaId, procedureCode, serviceDate, now) {
  const key = `${pesertaId}|${procedureCode}|${serviceDate}`;
  return pushTimestamp(duplicateWindow, key, now, 5 * 60 * 1000);
}

// Kembalikan jumlah klaim peserta dalam 1 jam terakhir
function countPesertaFrequency(pesertaId, now) {
  return pushTimestamp(frequencyWindow, pesertaId, now, 60 * 60 * 1000);
}

// Kembalikan jumlah klaim faskes dalam 10 menit terakhir
function countFaskesVolume(faskesId, now) {
  return pushTimestamp(faskesWindow, faskesId, now, 10 * 60 * 1000);
}

// Cleanup periodik — buang key yang sudah tidak ada entri
function cleanup() {
  for (const [k, v] of duplicateWindow) if (!v.length) duplicateWindow.delete(k);
  for (const [k, v] of frequencyWindow) if (!v.length) frequencyWindow.delete(k);
  for (const [k, v] of faskesWindow) if (!v.length) faskesWindow.delete(k);
}

// Jalankan cleanup setiap 5 menit
setInterval(cleanup, 5 * 60 * 1000);

module.exports = {
  recordAmount,
  getMedianAmount,
  getAmountHistoryLength,
  countDuplicate,
  countPesertaFrequency,
  countFaskesVolume,
};
