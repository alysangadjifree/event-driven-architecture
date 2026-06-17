const duckdb = require("duckdb");
const path = require("path");

const DB_PATH = process.env.DUCKDB_PATH || "/var/lib/duckdb/fraud.db";

let conn;

function run(sql, ...params) {
  return new Promise((resolve, reject) => {
    conn.run(sql, ...params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function all(sql, ...params) {
  return new Promise((resolve, reject) => {
    conn.all(sql, ...params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDB() {
  const db = new duckdb.Database(DB_PATH);
  conn = new duckdb.Connection(db);

  await run(`
    CREATE TABLE IF NOT EXISTS claims (
      claim_id     VARCHAR PRIMARY KEY,
      peserta_id   VARCHAR,
      faskes_id    VARCHAR,
      faskes_name  VARCHAR,
      faskes_type  VARCHAR,
      diagnosis_code VARCHAR,
      procedure_code VARCHAR,
      claim_amount DOUBLE,
      service_date VARCHAR,
      submitted_at VARCHAR,
      region       VARCHAR,
      is_anomaly   BOOLEAN,
      anomaly_type VARCHAR,
      inserted_at  TIMESTAMP DEFAULT current_timestamp
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id           VARCHAR PRIMARY KEY,
      alert_id     VARCHAR,
      claim_id     VARCHAR,
      peserta_id   VARCHAR,
      faskes_id    VARCHAR,
      faskes_name  VARCHAR,
      claim_amount DOUBLE,
      region       VARCHAR,
      rule_name    VARCHAR,
      severity     VARCHAR,
      reason       VARCHAR,
      detected_at  VARCHAR,
      inserted_at  TIMESTAMP DEFAULT current_timestamp
    )
  `);

  console.log(`[duckdb] Database ready: ${DB_PATH}`);
}

async function insertClaim(claim) {
  try {
    await run(
      `INSERT INTO claims
        (claim_id, peserta_id, faskes_id, faskes_name, faskes_type,
         diagnosis_code, procedure_code, claim_amount, service_date,
         submitted_at, region, is_anomaly, anomaly_type)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT DO NOTHING`,
      claim.claim_id,
      claim.peserta_id,
      claim.faskes_id,
      claim.faskes_name,
      claim.faskes_type || null,
      claim.diagnosis_code,
      claim.procedure_code,
      claim.claim_amount,
      claim.service_date || null,
      claim.submitted_at || null,
      claim.region,
      claim.is_anomaly || false,
      claim.anomaly_type || null
    );
  } catch (err) {
    console.error("[duckdb] insertClaim error:", err.message);
  }
}

async function insertAlert(alert) {
  const rules = Array.isArray(alert.alerts) ? alert.alerts : [];
  for (const rule of rules) {
    const id = `${alert.alert_id}:${rule.rule_name}`;
    try {
      await run(
        `INSERT INTO fraud_alerts
          (id, alert_id, claim_id, peserta_id, faskes_id, faskes_name,
           claim_amount, region, rule_name, severity, reason, detected_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT DO NOTHING`,
        id,
        alert.alert_id,
        alert.claim_id,
        alert.peserta_id,
        alert.faskes_id,
        alert.faskes_name,
        alert.claim_amount,
        alert.region,
        rule.rule_name,
        rule.severity,
        rule.reason,
        alert.detected_at || null
      );
    } catch (err) {
      console.error("[duckdb] insertAlert error:", err.message);
    }
  }
}

function toNum(v) {
  return v == null ? 0 : Number(v);
}

async function queryAnalytics() {
  try {
    const [claimRow] = await all(`SELECT COUNT(*) AS total FROM claims`);
    const [alertRow] = await all(
      `SELECT COUNT(*) AS total, COALESCE(SUM(claim_amount), 0) AS risk
       FROM (SELECT DISTINCT alert_id, claim_amount FROM fraud_alerts)`
    );
    const byRegion = await all(
      `SELECT region, CAST(COUNT(*) AS INTEGER) AS count
       FROM (SELECT DISTINCT alert_id, region FROM fraud_alerts)
       GROUP BY region ORDER BY count DESC`
    );
    const byRule = await all(
      `SELECT rule_name, severity, CAST(COUNT(*) AS INTEGER) AS count
       FROM fraud_alerts
       GROUP BY rule_name, severity ORDER BY count DESC`
    );

    return {
      totalClaims: toNum(claimRow.total),
      totalAlerts: toNum(alertRow.total),
      totalRiskAmount: toNum(alertRow.risk),
      byRegion: byRegion.map((r) => ({ region: r.region, count: toNum(r.count) })),
      byRule: byRule.map((r) => ({ rule_name: r.rule_name, severity: r.severity, count: toNum(r.count) })),
    };
  } catch (err) {
    console.error("[duckdb] queryAnalytics error:", err.message);
    return { totalClaims: 0, totalAlerts: 0, totalRiskAmount: 0, byRegion: [], byRule: [] };
  }
}

async function getSchema() {
  try {
    const tables = await all(`SHOW TABLES`);
    const schema = {};
    for (const t of tables) {
      const name = t.name;
      const cols = await all(`DESCRIBE ${name}`);
      schema[name] = cols.map((c) => ({ column_name: c.column_name, column_type: c.column_type }));
    }
    return schema;
  } catch (err) {
    console.error("[duckdb] getSchema error:", err.message);
    return {};
  }
}

const ALLOWED_PREFIX = /^\s*(select|show|describe|pragma)\b/i;

function sanitizeValue(v) {
  if (v == null) return null;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  return v;
}

async function queryRaw(sql) {
  if (!ALLOWED_PREFIX.test(sql)) {
    throw new Error("Hanya query SELECT / SHOW / DESCRIBE yang diizinkan");
  }
  const start = Date.now();
  const rows = await all(sql);
  const elapsed = ((Date.now() - start) / 1000).toFixed(3);

  if (rows.length === 0) {
    return { columns: [], rows: [], rowCount: 0, elapsed };
  }

  const columns = Object.keys(rows[0]);
  const data = rows.slice(0, 500).map((r) => columns.map((c) => sanitizeValue(r[c])));
  return { columns, rows: data, rowCount: rows.length, elapsed };
}

module.exports = { initDB, insertClaim, insertAlert, queryAnalytics, getSchema, queryRaw };
