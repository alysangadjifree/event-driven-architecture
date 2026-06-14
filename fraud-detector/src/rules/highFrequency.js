const store = require("../state/inMemoryStore");

const FREQUENCY_THRESHOLD = 5; // klaim per jam

// Aturan 3: satu peserta mengajukan terlalu banyak klaim dalam 1 jam
function check(claim, now) {
  const count = store.countPesertaFrequency(claim.peserta_id, now);

  if (count > FREQUENCY_THRESHOLD) {
    return {
      rule_name: "high_frequency",
      severity: "HIGH",
      reason: `Peserta ${claim.peserta_id} mengajukan ${count} klaim dalam 1 jam terakhir (batas: ${FREQUENCY_THRESHOLD})`,
    };
  }
  return null;
}

module.exports = { check };
