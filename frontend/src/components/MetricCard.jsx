export default function MetricCard({ label, value, sub, color = "blue" }) {
  const colors = {
    blue:   "border-blue-500/30 bg-blue-950/30",
    red:    "border-red-500/30 bg-red-950/30",
    yellow: "border-yellow-500/30 bg-yellow-950/30",
    green:  "border-green-500/30 bg-green-950/30",
  };
  const textColors = {
    blue:   "text-blue-400",
    red:    "text-red-400",
    yellow: "text-yellow-400",
    green:  "text-green-400",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
