// Diagnosis dan prosedur harus dikopikan dari generator agar konsisten
const { DIAGNOSIS_PROCEDURE_MAP } = require("../data/diagnosisProcedureMap");

// Aturan 4: procedure_code tidak valid untuk diagnosis_code yang diberikan
function check(claim) {
  const validProcs = DIAGNOSIS_PROCEDURE_MAP[claim.diagnosis_code];

  // Kode diagnosis tidak dikenal → tidak bisa divalidasi
  if (!validProcs) return null;

  if (!validProcs.includes(claim.procedure_code)) {
    return {
      rule_name: "inconsistent_diagnosis",
      severity: "MEDIUM",
      reason: `Prosedur ${claim.procedure_code} tidak sesuai dengan diagnosis ${claim.diagnosis_code}. Prosedur valid: ${validProcs.join(", ")}`,
    };
  }
  return null;
}

module.exports = { check };
