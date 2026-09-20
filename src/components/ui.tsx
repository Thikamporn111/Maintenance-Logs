import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

const PILL_CLASS: Record<string, string> = {
  Running: "pill-ok", Closed: "pill-ok", Done: "pill-ok",
  Alarm: "pill-alarm", Open: "pill-alarm",
  Maintenance: "pill-mnt", "In Progress": "pill-mnt",
  "Waiting Part": "pill-wait",
  Stop: "pill",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`pill ${PILL_CLASS[status] ?? ""}`}>{label || status}</span>;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </div>
  );
}

export function LinkButton({
  href,
  icon,
  children,
  primary,
}: {
  href: string;
  icon?: IconName;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link href={href} className={`btn ${primary ? "btn-primary" : ""}`}>
      {icon && <Icon name={icon} className="size-4" />}
      <span>{children}</span>
    </Link>
  );
}

const NOTICES: Record<string, { th: string; en: string }> = {
  created: { th: "บันทึกรายการใหม่แล้ว", en: "Item created successfully" },
  updated: { th: "บันทึกการแก้ไขแล้ว", en: "Item updated successfully" },
  deleted: { th: "ลบรายการแล้ว", en: "Item deleted" },
  deactivated: { th: "ปิดใช้งานแผนแล้ว", en: "Plan deactivated" },
  role_created: { th: "สร้าง Role ใหม่เรียบร้อยแล้ว", en: "Role created successfully" },
  role_updated: { th: "บันทึกการแก้ไขสิทธิ์ Role เรียบร้อยแล้ว", en: "Role permissions updated successfully" },
  role_deleted: { th: "ลบ Role เรียบร้อยแล้ว", en: "Role deleted successfully" },
};

/** Success banner after a redirect (?notice=created&id=M-011). Only known codes are shown. */
export function Notice({
  code,
  id,
  locale = "th",
}: {
  code?: string | string[];
  id?: string | string[];
  locale?: string;
}) {
  const codeStr = typeof code === "string" ? code : undefined;
  const entry = codeStr ? NOTICES[codeStr] : undefined;
  if (!entry) return null;
  const text = locale === "en" ? entry.en : entry.th;
  const ref = typeof id === "string" && /^[A-Z]{1,3}-\d{3,4}$/.test(id) ? id : "";
  return (
    <div className="notice" role="status">
      <Icon name="check" className="size-4.5 text-ok shrink-0" />
      <span className="font-medium">
        {text}
        {ref && (
          <>
            {" "}· <b className="font-mono">{ref}</b>
          </>
        )}
      </span>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      <Icon name="alert" className="size-4.5 text-alarm shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2/40 px-6 py-14 text-center text-muted">
      <Icon name="search" className="size-8 text-faint" />
      <p className="text-sm">{children}</p>
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  required,
  children,
  full,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`field ${error ? "invalid" : ""} ${full ? "sm:col-span-2" : ""}`}>
      <label htmlFor={name} className="flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-alarm font-bold"> *</span>}
        </span>
      </label>
      {children}
      {error ? (
        <span className="err" id={`${name}-err`}>
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Options({
  list,
  placeholder,
}: {
  list: readonly (string | readonly [string, string])[];
  placeholder?: string;
}) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {list.map((o) => {
        const [v, l] = typeof o === "string" ? [o, o] : o;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </>
  );
}
