import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

const SEVERITY_COLOR = {
  HIGH:   { badge: "text-red-400 bg-red-950/40 border-red-500/30",    bar: "#f87171" },
  MEDIUM: { badge: "text-yellow-400 bg-yellow-950/40 border-yellow-500/30", bar: "#fbbf24" },
  LOW:    { badge: "text-blue-400 bg-blue-950/40 border-blue-500/30",  bar: "#60a5fa" },
};

const REGION_COLORS = [
  "#60a5fa", "#34d399", "#f472b6", "#facc15",
  "#a78bfa", "#fb923c", "#38bdf8", "#4ade80",
];

const formatRupiah = (n) => {
  if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}Jt`;
  return `Rp${(n / 1_000).toFixed(0)}K`;
};

const RULE_LABEL = {
  duplicate_claim:        "Duplikat Klaim",
  abnormal_amount:        "Amount Abnormal",
  high_frequency:         "Frekuensi Tinggi",
  inconsistent_diagnosis: "Diagnosis Tdk Sesuai",
  faskes_spike:           "Lonjakan Faskes",
};

const shortRegion = (r) =>
  r.replace("Kepulauan ", "Kep. ")
   .replace("Kalimantan ", "Kal. ")
   .replace("Sulawesi ", "Sul. ")
   .replace("Sumatera ", "Sum. ");

export default function AnalyticsPanel({ analytics }) {
  if (!analytics) {
    return (
      <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-purple-500/40" />
          <p className="text-xs text-gray-500 uppercase tracking-wider">DuckDB Analytics — Data Persisten</p>
        </div>
        <p className="text-xs text-gray-600 italic pl-4">Menunggu data pertama dari DuckDB…</p>
      </div>
    );
  }

  const { totalClaims, totalAlerts, totalRiskAmount, byRegion = [], byRule = [] } = analytics;

  const maxRuleCount = byRule.reduce((m, r) => Math.max(m, r.count), 0);

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        <p className="text-xs text-gray-400 uppercase tracking-wider">
          DuckDB Analytics — Data Persisten
        </p>
        <span className="ml-auto text-[10px] text-gray-600">update setiap 10 dtk</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border border-purple-500/20 bg-gray-900/60 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Claims Tersimpan</p>
          <p className="text-3xl font-bold text-purple-300">{totalClaims.toLocaleString("id-ID")}</p>
          <p className="text-[10px] text-gray-600 mt-1">total di DuckDB</p>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-gray-900/60 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Alert Tersimpan</p>
          <p className="text-3xl font-bold text-purple-300">{totalAlerts.toLocaleString("id-ID")}</p>
          <p className="text-[10px] text-gray-600 mt-1">fraud event unik</p>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-gray-900/60 p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Nilai Fraud</p>
          <p className="text-3xl font-bold text-purple-300">{formatRupiah(totalRiskAmount)}</p>
          <p className="text-[10px] text-gray-600 mt-1">akumulasi klaim fraud</p>
        </div>
      </div>

      {/* Charts row: bar chart (wider) + rule breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        {/* Bar chart: fraud by region */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Fraud per Wilayah</p>
          {byRegion.length === 0 ? (
            <p className="text-xs text-gray-700 italic">Belum ada data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byRegion} margin={{ top: 4, right: 8, left: -16, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="region"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={shortRegion}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} width={28} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#d1d5db" }}
                  itemStyle={{ color: "#a78bfa" }}
                  formatter={(v) => [v.toLocaleString("id-ID"), "Alert"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {byRegion.map((_, i) => (
                    <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rule breakdown */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Fraud per Jenis Rule</p>
          {byRule.length === 0 ? (
            <p className="text-xs text-gray-700 italic">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {byRule.map((row, i) => {
                const style = SEVERITY_COLOR[row.severity] || SEVERITY_COLOR.LOW;
                const pct = maxRuleCount > 0 ? (row.count / maxRuleCount) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${style.badge}`}>
                          {row.severity}
                        </span>
                        <span className="text-xs text-gray-300 truncate">
                          {RULE_LABEL[row.rule_name] || row.rule_name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-purple-300 shrink-0 ml-2">
                        {Number(row.count).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full bg-gray-800">
                      <div
                        className="h-1 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: style.bar }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
