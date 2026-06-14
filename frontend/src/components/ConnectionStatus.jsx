export default function ConnectionStatus({ connected }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          connected ? "bg-green-400 shadow-[0_0_6px_#4ade80]" : "bg-red-500"
        }`}
      />
      <span className={connected ? "text-green-400" : "text-red-400"}>
        {connected ? "Terhubung" : "Memulihkan koneksi..."}
      </span>
    </div>
  );
}
