const { Router } = require("express");
const { queryAnalytics, getSchema, queryRaw } = require("../db/duckdb");

const router = Router();

router.get("/summary", async (_req, res) => {
  const data = await queryAnalytics();
  res.json(data);
});

router.get("/by-region", async (_req, res) => {
  const { byRegion } = await queryAnalytics();
  res.json(byRegion);
});

router.get("/by-rule", async (_req, res) => {
  const { byRule } = await queryAnalytics();
  res.json(byRule);
});

router.get("/schema", async (_req, res) => {
  const schema = await getSchema();
  res.json(schema);
});

router.post("/query", async (req, res) => {
  const { sql } = req.body;
  if (!sql || typeof sql !== "string") {
    return res.status(400).json({ error: "Field 'sql' harus berupa string" });
  }
  try {
    const result = await queryRaw(sql.trim());
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
