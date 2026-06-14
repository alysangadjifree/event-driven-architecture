const { v4: uuidv4 } = require("uuid");
const { FASKES_LIST } = require("./data/faskesData");
const {
  DIAGNOSIS_PROCEDURE_MAP,
  PROCEDURE_MEDIAN_COST,
  ALL_DIAGNOSIS_CODES,
  ALL_PROCEDURE_CODES,
} = require("./data/diagnosisProcedureMap");

const ANOMALY_RATIO = parseFloat(process.env.ANOMALY_RATIO || "0.12");

// Pool peserta — 200 ID untuk menciptakan pola berulang yang realistis
const PESERTA_POOL = Array.from({ length: 200 }, (_, i) =>
  `BPJS-${String(i + 1).padStart(6, "0")}`
);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Buat klaim normal: diagnosis dan prosedur konsisten, amount wajar
function buildNormalClaim() {
  const diagCode = pick(ALL_DIAGNOSIS_CODES);
  const validProcs = DIAGNOSIS_PROCEDURE_MAP[diagCode];
  const procCode = pick(validProcs);
  const median = PROCEDURE_MEDIAN_COST[procCode] || 100000;
  // Variasi ±40% di sekitar median
  const amount = Math.round(median * (0.6 + Math.random() * 0.8));
  const faskes = pick(FASKES_LIST);
  const serviceDate = new Date();
  serviceDate.setHours(serviceDate.getHours() - randomInt(0, 72));

  return {
    claim_id: uuidv4(),
    peserta_id: pick(PESERTA_POOL),
    faskes_id: faskes.faskes_id,
    faskes_type: faskes.faskes_type,
    faskes_name: faskes.name,
    diagnosis_code: diagCode,
    procedure_code: procCode,
    claim_amount: amount,
    service_date: serviceDate.toISOString().split("T")[0],
    submitted_at: new Date().toISOString(),
    region: faskes.region,
    is_anomaly: false,
    anomaly_type: null,
  };
}

// ─── Generator anomali ────────────────────────────────────────────────────────

// State sederhana untuk anomali duplikat dan high-frequency
const recentClaims = []; // buffer ~100 klaim terakhir untuk duplikasi

function buildAnomalyClaim() {
  const anomalyType = pick([
    "high_amount",
    "high_amount",          // bobotkan agar lebih sering muncul
    "duplicate",
    "inconsistent_diagnosis",
    "high_frequency",
  ]);

  const base = buildNormalClaim();

  switch (anomalyType) {
    case "high_amount": {
      // Amount 3–8× di atas median
      const median = PROCEDURE_MEDIAN_COST[base.procedure_code] || 100000;
      base.claim_amount = Math.round(median * (3.2 + Math.random() * 4.8));
      break;
    }
    case "duplicate": {
      // Salin peserta + prosedur + tanggal dari klaim yang baru saja dibuat
      if (recentClaims.length > 0) {
        const src = pick(recentClaims.slice(-30));
        base.peserta_id = src.peserta_id;
        base.procedure_code = src.procedure_code;
        base.service_date = src.service_date;
        // Tetap buat claim_id baru agar terlihat sebagai klaim baru
      }
      break;
    }
    case "inconsistent_diagnosis": {
      // Pasangkan diagnosis dengan prosedur acak yang BUKAN prosedurnya
      const wrongProcs = ALL_PROCEDURE_CODES.filter(
        (p) => !DIAGNOSIS_PROCEDURE_MAP[base.diagnosis_code].includes(p)
      );
      if (wrongProcs.length > 0) {
        base.procedure_code = pick(wrongProcs);
      }
      break;
    }
    case "high_frequency": {
      // Gunakan peserta yang sama berulang kali (dipilih dari pool kecil)
      const hotPeserta = PESERTA_POOL.slice(0, 5); // 5 peserta "hot"
      base.peserta_id = pick(hotPeserta);
      break;
    }
  }

  base.is_anomaly = true;
  base.anomaly_type = anomalyType;
  return base;
}

function generateClaim() {
  const isAnomaly = Math.random() < ANOMALY_RATIO;
  const claim = isAnomaly ? buildAnomalyClaim() : buildNormalClaim();

  // Simpan ke buffer untuk referensi anomali duplikat
  recentClaims.push(claim);
  if (recentClaims.length > 100) recentClaims.shift();

  return claim;
}

module.exports = { generateClaim };
