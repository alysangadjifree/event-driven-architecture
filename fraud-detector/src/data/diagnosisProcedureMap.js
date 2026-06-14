// Salinan dari generator/src/data/diagnosisProcedureMap.js
// (setiap service berdiri sendiri di Docker, sehingga data dikopi bukan dishare via symlink)

const DIAGNOSIS_PROCEDURE_MAP = {
  "I10": ["PRCS-HT-01", "PRCS-HT-02", "PRCS-LAB-BP"],
  "E11": ["PRCS-DM-01", "PRCS-DM-02", "PRCS-LAB-GD", "PRCS-LAB-HBA1C"],
  "J06": ["PRCS-ISPA-01", "PRCS-ISPA-02"],
  "K29": ["PRCS-GAS-01", "PRCS-LAB-ENDOS"],
  "A15": ["PRCS-TB-01", "PRCS-TB-02", "PRCS-RAD-XRAY"],
  "A91": ["PRCS-DBD-01", "PRCS-LAB-NS1", "PRCS-LAB-DPL"],
  "S52": ["PRCS-FRAK-01", "PRCS-RAD-XRAY", "PRCS-ORTHO-01"],
  "H26": ["PRCS-MATA-01", "PRCS-MATA-02"],
  "K37": ["PRCS-APD-01", "PRCS-APD-02", "PRCS-LAB-DPL"],
  "Z37": ["PRCS-OBS-01", "PRCS-OBS-02"],
};

module.exports = { DIAGNOSIS_PROCEDURE_MAP };
