const SEVERITY_STYLE = {
  HIGH:   "bg-red-500/20 text-red-400 border-red-500/40",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  LOW:    "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

const RULE_LABEL = {
  duplicate_claim:        "Duplikat",
  abnormal_amount:        "Amount Abnormal",
  high_frequency:         "Frekuensi Tinggi",
  inconsistent_diagnosis: "Diagnosis Tdk Konsisten",
  faskes_spike:           "Lonjakan Faskes",
};

export default function FraudAlertFeed({ alerts }) {
  return (
    <div className="rounded-xl border border-red-900/40 bg-gray-900/50 p-4 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
        Fraud Alerts
      </h2>
      <div className="overflow-y-auto feed-scroll flex-1 space-y-2">
        {alerts.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Belum ada alert</p>
        )}
        {alerts.map((a) => (
          <div
            key={a.alert_id}
            className="p-2.5 rounded-lg bg-red-950/30 border border-red-800/30 text-xs space-y-1.5"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-gray-400">{a.claim_id?.slice(-8)}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-300">{a.peserta_id}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">Rp{(a.claim_amount / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {a.alerts?.map((rule, i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                    SEVERITY_STYLE[rule.severity] || SEVERITY_STYLE.LOW
                  }`}
                >
                  {RULE_LABEL[rule.rule_name] || rule.rule_name}
                </span>
              ))}
            </div>
            {a.alerts?.[0]?.reason && (
              <p className="text-gray-500 leading-tight">{a.alerts[0].reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
