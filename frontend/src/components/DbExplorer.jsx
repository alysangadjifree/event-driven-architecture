import { useState, useEffect, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const PRESETS = [
  {
    label: "10 Klaim Terbaru",
    sql: "SELECT claim_id, peserta_id, faskes_name, procedure_code, claim_amount, region, inserted_at\nFROM claims\nORDER BY inserted_at DESC\nLIMIT 10",
  },
  {
    label: "10 Alert Terbaru",
    sql: "SELECT alert_id, rule_name, severity, peserta_id, region, claim_amount, detected_at\nFROM fraud_alerts\nORDER BY inserted_at DESC\nLIMIT 10",
  },
  {
    label: "Fraud per Wilayah",
    sql: "SELECT region, COUNT(DISTINCT alert_id) AS total_fraud\nFROM fraud_alerts\nGROUP BY region\nORDER BY total_fraud DESC",
  },
  {
    label: "Fraud per Rule",
    sql: "SELECT rule_name, severity, COUNT(*) AS total\nFROM fraud_alerts\nGROUP BY rule_name, severity\nORDER BY total DESC",
  },
  {
    label: "Klaim Anomali",
    sql: "SELECT claim_id, peserta_id, anomaly_type, claim_amount, region\nFROM claims\nWHERE is_anomaly = true\nORDER BY inserted_at DESC\nLIMIT 20",
  },
];

function SchemaPanel({ schema, onClickColumn }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (t) => setExpanded((prev) => ({ ...prev, [t]: !prev[t] }));

  return (
    <div className="text-xs space-y-1">
      {Object.entries(schema).map(([table, cols]) => (
        <div key={table}>
          <button
            onClick={() => toggle(table)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-800 transition-colors text-left"
          >
            <span className="text-purple-400">{expanded[table] ? "▾" : "▸"}</span>
            <span
              className="font-mono text-gray-200 font-medium cursor-pointer hover:text-purple-300"
              onClick={(e) => { e.stopPropagation(); onClickColumn(table); }}
              title="Klik untuk insert nama tabel ke query"
            >
              {table}
            </span>
            <span className="text-gray-600 ml-auto">{cols.length} kol</span>
          </button>
          {expanded[table] && (
            <div className="pl-5 space-y-0.5 mb-1">
              {cols.map((c) => (
                <button
                  key={c.column_name}
                  onClick={() => onClickColumn(c.column_name)}
                  className="w-full flex items-center justify-between px-2 py-0.5 rounded hover:bg-gray-800/70 text-left"
                  title="Klik untuk insert nama kolom ke query"
                >
                  <span className="font-mono text-blue-400">{c.column_name}</span>
                  <span className="text-gray-600">{c.column_type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ResultTable({ columns, rows, rowCount, elapsed }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        <span className="text-green-400 font-medium">{rowCount.toLocaleString("id-ID")} baris</span>
        {rowCount > 500 && <span className="text-yellow-500"> (ditampilkan 500 pertama)</span>}
        <span className="ml-2 text-gray-600">{elapsed} dtk</span>
      </p>
      <div className="overflow-x-auto overflow-y-auto max-h-[380px] rounded-lg border border-gray-700/50">
        <table className="text-xs w-full border-collapse">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-700/50 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-800/20"}>
                {row.map((val, j) => (
                  <td key={j} className="px-3 py-1.5 text-gray-300 border-b border-gray-800/50 whitespace-nowrap font-mono max-w-[200px] truncate" title={String(val ?? "")}>
                    {val == null
                      ? <span className="text-gray-600 italic">null</span>
                      : typeof val === "boolean"
                        ? <span className={val ? "text-green-400" : "text-red-400"}>{String(val)}</span>
                        : String(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DbExplorer() {
  const [schema, setSchema] = useState({});
  const [sql, setSql] = useState(PRESETS[0].sql);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/analytics/schema`)
      .then((r) => r.json())
      .then(setSchema)
      .catch(() => {});
  }, []);

  const runQuery = useCallback(async () => {
    if (!sql.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/analytics/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query gagal");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sql, loading]);

  const insertText = useCallback((text) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newSql = sql.slice(0, start) + text + sql.slice(end);
    setSql(newSql);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length;
      ta.focus();
    }, 0);
  }, [sql]);

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  };

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <p className="text-xs text-gray-400 uppercase tracking-wider">DuckDB Explorer</p>
        <span className="ml-auto text-[10px] text-gray-600">Ctrl+Enter untuk jalankan</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
        {/* Schema sidebar */}
        <div className="rounded-lg border border-gray-700/40 bg-gray-900/50 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-2">Tabel & Kolom</p>
          {Object.keys(schema).length === 0
            ? <p className="text-xs text-gray-700 italic px-2">Memuat schema…</p>
            : <SchemaPanel schema={schema} onClickColumn={insertText} />
          }
        </div>

        {/* Query + results */}
        <div className="flex flex-col gap-3">
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setSql(p.sql)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700/50 hover:border-purple-500/40 text-gray-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* SQL textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              className="w-full rounded-lg border border-gray-700/50 bg-gray-900/80 text-gray-200 font-mono text-xs p-3 resize-y focus:outline-none focus:border-emerald-500/50 placeholder-gray-700"
              placeholder="Tulis query SQL di sini… (hanya SELECT)"
              spellCheck={false}
            />
          </div>

          {/* Run button */}
          <div>
            <button
              onClick={runQuery}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 disabled:cursor-wait text-white text-xs font-semibold transition-colors"
            >
              {loading ? "Memproses…" : "▶ Jalankan"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <ResultTable
              columns={result.columns}
              rows={result.rows}
              rowCount={result.rowCount}
              elapsed={result.elapsed}
            />
          )}
        </div>
      </div>
    </div>
  );
}
