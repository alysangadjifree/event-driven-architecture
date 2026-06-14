import { useState, useCallback } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import ConnectionStatus from "./components/ConnectionStatus";
import MetricCard from "./components/MetricCard";
import ClaimFeed from "./components/ClaimFeed";
import FraudAlertFeed from "./components/FraudAlertFeed";
import TrendChart from "./components/TrendChart";

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
    }
  }, []);

  const connected = useWebSocket(handleMessage);

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
        <ConnectionStatus connected={connected} />
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
      <div className="mb-6">
        <TrendChart trend={stats.trend} />
      </div>

      {/* Live Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: "400px" }}>
        <ClaimFeed claims={claims} />
        <FraudAlertFeed alerts={alerts} />
      </div>
    </div>
  );
}
