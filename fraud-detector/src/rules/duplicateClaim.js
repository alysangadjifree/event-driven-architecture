const store = require("../state/inMemoryStore");

// Aturan 1: klaim duplikat dalam window 5 menit
function check(claim, now) {
  const count = store.countDuplicate(
    claim.peserta_id,
    claim.procedure_code,
    claim.service_date,
    now
  );

  if (count >= 2) {
    return {
      rule_name: "duplicate_claim",
      severity: "HIGH",
      reason: `Peserta ${claim.peserta_id} mengajukan prosedur ${claim.procedure_code} pada ${claim.service_date} sebanyak ${count}× dalam 5 menit terakhir`,
    };
  }
  return null;
}

module.exports = { check };
