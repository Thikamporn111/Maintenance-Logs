import { fmtDate } from "@/lib/time";
import type { MachineStatus } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

export function AlarmChart({
  data,
  locale = "th",
}: {
  data: { date: string; count: number }[];
  locale?: Locale;
}) {
  const W = 640,
    H = 220,
    L = 36,
    R = 16,
    T = 24,
    B = 38;
  const max = Math.max(4, Math.ceil(Math.max(...data.map((d) => d.count)) / 2) * 2);
  const cw = (W - L - R) / (data.length || 1);
  const bw = Math.min(46, cw * 0.58);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full min-h-[170px]"
        role="img"
        aria-label={locale === "en" ? "Alarm count for last 7 days" : "กราฟจำนวน Alarm รายวัน 7 วันล่าสุด"}
      >
        <defs>
          <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--alarm)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--alarm)" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="barGradientPast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line
              x1={L}
              x2={W - R}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--line)"
              strokeDasharray={t ? "4 4" : undefined}
              strokeWidth="1"
            />
            <text
              x={L - 10}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--muted)"
              fontFamily="var(--font-mono)"
            >
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + cw * i + (cw - bw) / 2;
          const last = i === data.length - 1;
          const barHeight = Math.max(0, y(0) - y(d.count));
          return (
            <g key={d.date} className="transition-opacity hover:opacity-85">
              <rect
                x={x}
                y={y(d.count)}
                width={bw}
                height={barHeight}
                rx={7}
                fill={last ? "url(#barGradientToday)" : "url(#barGradientPast)"}
              />
              {d.count > 0 && (
                <text
                  x={x + bw / 2}
                  y={y(d.count) - 7}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="var(--ink)"
                  fontFamily="var(--font-mono)"
                >
                  {d.count}
                </text>
              )}
              <text
                x={x + bw / 2}
                y={H - 12}
                textAnchor="middle"
                fontSize="11.5"
                fill={last ? "var(--ink)" : "var(--muted)"}
                fontWeight={last ? 600 : 400}
              >
                {last
                  ? locale === "en"
                    ? "Today"
                    : "วันนี้"
                  : fmtDate(d.date, { weekday: "short", day: "numeric" }, locale)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const STATUS_COLOR: Record<MachineStatus, string> = {
  Running: "var(--ok)",
  Stop: "var(--stop)",
  Alarm: "var(--alarm)",
  Maintenance: "var(--mnt)",
};

export function StatusBar({
  counts,
  locale = "th",
}: {
  counts: Record<MachineStatus, number>;
  locale?: Locale;
}) {
  const entries = (Object.keys(STATUS_COLOR) as MachineStatus[]).map(
    (s) => [s, counts[s] ?? 0] as const
  );
  const total = entries.reduce((sum, [, n]) => sum + n, 0) || 1;
  let x = 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      <svg
        viewBox="0 0 100 6"
        preserveAspectRatio="none"
        className="block h-3.5 w-full overflow-hidden rounded-full shadow-inner bg-surface-2"
        role="img"
        aria-label={locale === "en" ? "Machine status proportion" : "สัดส่วนสถานะเครื่องจักร"}
      >
        {entries.map(([s, n]) => {
          const w = (n / total) * 100;
          const rect = (
            <rect
              key={s}
              x={x}
              y={0}
              width={w}
              height={6}
              fill={STATUS_COLOR[s]}
            />
          );
          x += w;
          return rect;
        })}
      </svg>

      {/* Legend with Status Dots and Counts */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        {entries.map(([s, n]) => (
          <div key={s} className="flex items-center gap-1.5 font-medium">
            <span
              className="size-2.5 rounded-full ring-2 ring-surface shadow-2xs"
              style={{ background: STATUS_COLOR[s] }}
            />
            <span className="text-muted">{s}</span>
            <b className="num text-ink font-bold">{n}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopMachines({
  rows,
  locale = "th",
}: {
  rows: { id: string; type: string; count: number }[];
  locale?: Locale;
}) {
  if (!rows.length) {
    return (
      <div className="text-xs text-muted py-6 text-center">
        {locale === "en" ? "No alarm data in last 7 days" : "ไม่มีข้อมูล Alarm 7 วันล่าสุด"}
      </div>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => {
        const pct = Math.round((r.count / max) * 100);
        return (
          <div key={r.id} className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="grid size-5 place-items-center rounded-md bg-surface-2 font-mono text-[10px] font-bold text-muted">
                  {i + 1}
                </span>
                <span className="font-mono font-bold text-accent">{r.id}</span>
                <span className="truncate text-muted">{r.type}</span>
              </div>
              <span className="num font-bold text-ink shrink-0 ml-2">
                {r.count} {locale === "en" ? "times" : "ครั้ง"}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-rose-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
