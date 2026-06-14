const { Router } = require("express");
const { getStats, getRecentClaims, getRecentAlerts } = require("../state/statsStore");

const router = Router();

router.get("/stats", (_req, res) => {
  res.json(getStats());
});

router.get("/recent-claims", (_req, res) => {
  res.json(getRecentClaims());
});

router.get("/recent-alerts", (_req, res) => {
  res.json(getRecentAlerts());
});

module.exports = router;
