// Domain time utilities for plant time zone (UTC+7, Asia/Bangkok).
export const PLANT_TZ = "Asia/Bangkok";
const OFFSET_MS = 7 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** Calendar date (YYYY-MM-DD) at the plant for a given instant. */
export function plantDate(at: Date = new Date()): string {
  const t = new Date(at.getTime() + OFFSET_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Parse a <input type="datetime-local"> value typed at the plant. Returns an invalid Date if malformed. */
export function parsePlantDateTime(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) return new Date(NaN);
  return new Date(`${s.length === 16 ? `${s}:00` : s}+07:00`);
}

/** Value for a datetime-local input showing the plant time of an instant. */
export function toPlantInput(iso?: string | null): string {
  const t = new Date((iso ? new Date(iso) : new Date()).getTime() + OFFSET_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

export function fmtDateTime(iso: string | null | undefined, locale: string = "th"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const loc = locale === "en" ? "en-US" : "th-TH";
  return `${d.toLocaleDateString(loc, { day: "numeric", month: "short", timeZone: PLANT_TZ })} ${d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", timeZone: PLANT_TZ })}`;
}

/** Format a plant calendar date (YYYY-MM-DD). */
export function fmtDate(
  s: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "2-digit" },
  locale: string = "th"
): string {
  if (!s) return "—";
  const loc = locale === "en" ? "en-US" : "th-TH";
  return new Date(`${s}T12:00:00+07:00`).toLocaleDateString(loc, { ...opts, timeZone: PLANT_TZ });
}
