import { useState, useCallback, useEffect } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import ConnectionStatus from "./components/ConnectionStatus";
import MetricCard from "./components/MetricCard";
import ClaimFeed from "./components/ClaimFeed";
import FraudAlertFeed from "./components/FraudAlertFeed";
import TrendChart from "./components/TrendChart";
import AnalyticsPanel from "./components/AnalyticsPanel";
import DbExplorer from "./components/DbExplorer";

const MAX_FEED = 50;

export default function App() {
  const [stats, setStats] = useState({
    totalClaims: 0,
    totalFraud: 0,
    totalRiskAmount: 0,
    throughput: 0,
    trend: [],
  });
  const [claims, setClaims] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showExplorer, setShowExplorer] = useState(false);

  const handleMessage = useCallback((payload) => {
    switch (payload.type) {
      case "stats":
        setStats(payload.data);
        break;
      case "claim":
        setClaims((prev) => [payload.data, ...prev].slice(0, MAX_FEED));
        break;
      case "alert":
        setAlerts((prev) => [payload.data, ...prev].slice(0, MAX_FEED));
        break;
      case "analytics":
        setAnalytics(payload.data);
        break;
    }
  }, []);

  const connected = useWebSocket(handleMessage);

  // Fetch analytics awal saat mount (sebelum WebSocket broadcast pertama tiba)
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:3001";
    fetch(`${base}/api/analytics/summary`)
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => {});
  }, []);

  const formatRupiah = (n) => {
    if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)}M`;
    if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}Jt`;
    return `Rp${(n / 1_000).toFixed(0)}K`;
  };

  const fraudRate = stats.totalClaims > 0
    ? ((stats.totalFraud / stats.totalClaims) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 lg:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            BPJS Fraud Detection
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Simulasi Real-Time Event-Driven Architecture
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExplorer((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
              showExplorer
                ? "bg-emerald-800/40 border-emerald-500/40 text-emerald-300"
                : "bg-gray-800/60 border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600"
            }`}
          >
            {showExplorer ? "▼ DB Explorer" : "▶ DB Explorer"}
          </button>
          <ConnectionStatus connected={connected} />
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Total Transaksi"
          value={stats.totalClaims.toLocaleString("id-ID")}
          sub={`${stats.throughput} event/dtk`}
          color="blue"
        />
        <MetricCard
          label="Fraud Terdeteksi"
          value={stats.totalFraud.toLocaleString("id-ID")}
          sub={`${fraudRate}% dari total`}
          color="red"
        />
        <MetricCard
          label="Nilai Berisiko"
          value={formatRupiah(stats.totalRiskAmount)}
          sub="total nilai klaim fraud"
          color="yellow"
        />
        <MetricCard
          label="Throughput"
          value={`${stats.throughput}`}
          sub="event per detik"
          color="green"
        />
      </div>

      {/* Trend Chart */}
      <div className="mb-4">
        <TrendChart trend={stats.trend} />
      </div>

      {/* DuckDB Analytics — tepat di bawah Trend Chart */}
      <div className="mb-6">
        <AnalyticsPanel analytics={analytics} />
      </div>

      {/* Live Feeds — scrollable ke bawah */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ClaimFeed claims={claims} />
        <FraudAlertFeed alerts={alerts} />
      </div>

      {/* DuckDB Explorer — collapsible */}
      {showExplorer && <DbExplorer />}
    </div>
  );
}
