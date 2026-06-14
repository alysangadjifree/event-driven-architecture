const store = require("../state/inMemoryStore");

const MULTIPLIER_THRESHOLD = 3.0;
const MIN_SAMPLES = 10; // butuh minimal 10 sampel agar median stabil

// Aturan 2: nilai klaim jauh di atas median historis prosedur tersebut
function check(claim) {
  store.recordAmount(claim.procedure_code, claim.claim_amount);

  if (store.getAmountHistoryLength(claim.procedure_code) < MIN_SAMPLES) return null;

  const median = store.getMedianAmount(claim.procedure_code);

  if (median > 0 && claim.claim_amount > MULTIPLIER_THRESHOLD * median) {
    const rasio = (claim.claim_amount / median).toFixed(1);
    return {
      rule_name: "abnormal_amount",
      severity: "MEDIUM",
      reason: `Nilai klaim Rp${claim.claim_amount.toLocaleString("id-ID")} = ${rasio}× median (Rp${median.toLocaleString("id-ID")}) untuk prosedur ${claim.procedure_code}`,
    };
  }
  return null;
}

module.exports = { check };
