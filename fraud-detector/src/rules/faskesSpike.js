const store = require("../state/inMemoryStore");

const SPIKE_MULTIPLIER = 3.0;
const BASELINE_THRESHOLD = 5; // klaim per 10 menit sebelum baseline dianggap terbentuk

// Hitung baseline per faskes dari jendela yang lebih panjang (in-memory sederhana)
const faskesBaseline = new Map(); // Map<faskes_id, running_avg>

// Aturan 5: satu faskes tiba-tiba mengirim volume klaim jauh di atas baseline-nya
function check(claim, now) {
  const faskesId = claim.faskes_id;
  const count = store.countFaskesVolume(faskesId, now);

  // Update baseline dengan exponential moving average
  const prev = faskesBaseline.get(faskesId) || count;
  const ema = prev * 0.9 + count * 0.1;
  faskesBaseline.set(faskesId, ema);

  // Hanya alert jika baseline sudah terbentuk dan count melonjak
  if (prev >= BASELINE_THRESHOLD && count > SPIKE_MULTIPLIER * prev) {
    return {
      rule_name: "faskes_spike",
      severity: "HIGH",
      reason: `Faskes ${faskesId} (${claim.faskes_name}) mengirim ${count} klaim dalam 10 menit — ${(count / prev).toFixed(1)}× baseline (${prev.toFixed(1)})`,
    };
  }
  return null;
}

module.exports = { check };
