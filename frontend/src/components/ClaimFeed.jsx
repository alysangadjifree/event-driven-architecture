export default function ClaimFeed({ claims }) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900/50 p-4 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Live Feed Klaim
      </h2>
      <div className="overflow-y-auto feed-scroll flex-1 space-y-1.5">
        {claims.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Menunggu data...</p>
        )}
        {claims.map((c) => (
          <div
            key={c.claim_id}
            className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/60 text-xs hover:bg-gray-800 transition-colors"
          >
            <span className="text-gray-500 shrink-0 w-[70px] truncate font-mono">{c.claim_id.slice(-8)}</span>
            <div className="flex-1 min-w-0">
              <span className="text-gray-300">{c.peserta_id}</span>
              <span className="text-gray-500 mx-1">·</span>
              <span className="text-blue-400">{c.procedure_code}</span>
            </div>
            <span className="text-gray-400 shrink-0">
              Rp{(c.claim_amount / 1000).toFixed(0)}K
            </span>
            <span className="text-gray-600 shrink-0">{c.region?.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
