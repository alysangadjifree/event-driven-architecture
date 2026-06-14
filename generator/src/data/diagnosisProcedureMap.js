// Mapping kode ICD-10 (diagnosis) → prosedur yang valid
// Digunakan oleh generator (buat event) dan fraud-detector (validasi konsistensi)
const DIAGNOSIS_PROCEDURE_MAP = {
  // Hipertensi
  "I10": ["PRCS-HT-01", "PRCS-HT-02", "PRCS-LAB-BP"],
  // Diabetes melitus tipe 2
  "E11": ["PRCS-DM-01", "PRCS-DM-02", "PRCS-LAB-GD", "PRCS-LAB-HBA1C"],
  // ISPA / infeksi saluran napas atas
  "J06": ["PRCS-ISPA-01", "PRCS-ISPA-02"],
  // Gastritis
  "K29": ["PRCS-GAS-01", "PRCS-LAB-ENDOS"],
  // Tuberkulosis paru
  "A15": ["PRCS-TB-01", "PRCS-TB-02", "PRCS-RAD-XRAY"],
  // Demam berdarah
  "A91": ["PRCS-DBD-01", "PRCS-LAB-NS1", "PRCS-LAB-DPL"],
  // Fraktur lengan bawah
  "S52": ["PRCS-FRAK-01", "PRCS-RAD-XRAY", "PRCS-ORTHO-01"],
  // Katarak
  "H26": ["PRCS-MATA-01", "PRCS-MATA-02"],
  // Appendicitis
  "K37": ["PRCS-APD-01", "PRCS-APD-02", "PRCS-LAB-DPL"],
  // Persalinan normal
  "Z37": ["PRCS-OBS-01", "PRCS-OBS-02"],
};

// Biaya rata-rata (median) per prosedur dalam Rupiah — digunakan untuk aturan abnormal_amount
const PROCEDURE_MEDIAN_COST = {
  "PRCS-HT-01":    45000,
  "PRCS-HT-02":    65000,
  "PRCS-LAB-BP":   35000,
  "PRCS-DM-01":    55000,
  "PRCS-DM-02":    75000,
  "PRCS-LAB-GD":   40000,
  "PRCS-LAB-HBA1C":120000,
  "PRCS-ISPA-01":  50000,
  "PRCS-ISPA-02":  70000,
  "PRCS-GAS-01":   80000,
  "PRCS-LAB-ENDOS":850000,
  "PRCS-TB-01":    95000,
  "PRCS-TB-02":    110000,
  "PRCS-RAD-XRAY": 180000,
  "PRCS-DBD-01":   250000,
  "PRCS-LAB-NS1":  150000,
  "PRCS-LAB-DPL":  85000,
  "PRCS-FRAK-01":  450000,
  "PRCS-ORTHO-01": 2500000,
  "PRCS-MATA-01":  3500000,
  "PRCS-MATA-02":  4200000,
  "PRCS-APD-01":   5500000,
  "PRCS-APD-02":   6800000,
  "PRCS-OBS-01":   1800000,
  "PRCS-OBS-02":   2200000,
};

// Semua kode diagnosis yang tersedia
const ALL_DIAGNOSIS_CODES = Object.keys(DIAGNOSIS_PROCEDURE_MAP);

// Semua kode prosedur yang tersedia
const ALL_PROCEDURE_CODES = [...new Set(Object.values(DIAGNOSIS_PROCEDURE_MAP).flat())];

module.exports = {
  DIAGNOSIS_PROCEDURE_MAP,
  PROCEDURE_MEDIAN_COST,
  ALL_DIAGNOSIS_CODES,
  ALL_PROCEDURE_CODES,
};
