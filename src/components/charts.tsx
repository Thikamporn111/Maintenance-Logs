// Server-rendered SVG charts. Colors come from theme tokens so they work in light and dark.
import { fmtDate } from "@/lib/time";
import type { MachineStatus } from "@/lib/types";

export function AlarmChart({ data }: { data: { date: string; count: number }[] }) {
  const W = 560, H = 210, L = 30, R = 8, T = 18, B = 34;
  const max = Math.max(4, Math.ceil(Math.max(...data.map((d) => d.count)) / 2) * 2);
  const cw = (W - L - R) / data.length;
  const bw = Math.min(40, cw * 0.55);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="กราฟจำนวน Alarm รายวัน 7 วันล่าสุด">
      {[0, max / 2, max].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t ? "3 4" : undefined} />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="var(--font-mono)">{t}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = L + cw * i + (cw - bw) / 2;
        const last = i === data.length - 1;
        return (
          <g key={d.date}>
            <rect x={x} y={y(d.count)} width={bw} height={Math.max(0, y(0) - y(d.count))} rx={4} fill={last ? "var(--alarm)" : "color-mix(in srgb, var(--alarm) 38%, var(--surface))"} />
            {d.count > 0 && <text x={x + bw / 2} y={y(d.count) - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-mono)">{d.count}</text>}
            <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontSize="11.5" fill={last ? "var(--ink)" : "var(--muted)"} fontWeight={last ? 600 : 400}>
              {last ? "วันนี้" : fmtDate(d.date, { weekday: "short", day: "numeric" })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const STATUS_COLOR: Record<MachineStatus, string> = { Running: "var(--ok)", Stop: "var(--stop)", Alarm: "var(--alarm)", Maintenance: "var(--mnt)" };

export function StatusBar({ counts }: { counts: Record<MachineStatus, number> }) {
  const entries = (Object.keys(STATUS_COLOR) as MachineStatus[]).map((s) => [s, counts[s] ?? 0] as const);
  const total = entries.reduce((sum, [, n]) => sum + n, 0) || 1;
  let x = 0;
  return (
    <div>
      <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="block h-3 w-full overflow-hidden rounded-full" role="img" aria-label="สัดส่วนสถานะเครื่องจักร">
        <rect width="100" height="4" fill="var(--surface-2)" />
        {entries.map(([s, n]) => {
          const w = (n / total) * 100;
          const r = <rect key={s} x={x} width={Math.max(0, w - 0.4)} height="4" fill={STATUS_COLOR[s]} />;
          x += w;
          return n ? r : null;
        })}
      </svg>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
        {entries.map(([s, n]) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <svg className="size-2.5" viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" rx="2" fill={STATUS_COLOR[s]} /></svg>
            {s} <b className="num text-ink">{n}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TopMachines({ rows }: { rows: { id: string; type: string; count: number }[] }) {
  if (!rows.length) return <p className="py-6 text-center text-muted">ไม่มี Alarm ในช่วงนี้</p>;
  const max = rows[0].count;
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[110px_minmax(0,1fr)_28px] items-center gap-2.5 text-[13px]">
          <span className="truncate"><span className="font-mono">{r.id}</span> {r.type}</span>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-2.5 w-full" aria-hidden="true">
            <rect width="100" height="10" rx="5" fill="var(--surface-2)" />
            <rect width={(r.count / max) * 100} height="10" rx="5" fill="var(--alarm)" />
          </svg>
          <b className="num text-right">{r.count}</b>
        </div>
      ))}
    </div>
  );
}
