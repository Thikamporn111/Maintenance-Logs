import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

const PILL_CLASS: Record<string, string> = {
  Running: "pill-ok", Closed: "pill-ok", Done: "pill-ok",
  Alarm: "pill-alarm", Open: "pill-alarm",
  Maintenance: "pill-mnt", "In Progress": "pill-mnt",
  "Waiting Part": "pill-wait",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${PILL_CLASS[status] ?? ""}`}>{status}</span>;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function LinkButton({ href, icon, children, primary }: { href: string; icon?: IconName; children: ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={`btn ${primary ? "btn-primary" : ""}`}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}

const NOTICES: Record<string, string> = {
  created: "บันทึกรายการใหม่แล้ว",
  updated: "บันทึกการแก้ไขแล้ว",
  deleted: "ลบรายการแล้ว",
  deactivated: "ปิดใช้งานแผนแล้ว",
};

/** Success banner after a redirect (?notice=created&id=M-011). Only known codes are shown. */
export function Notice({ code, id }: { code?: string | string[]; id?: string | string[] }) {
  const text = typeof code === "string" ? NOTICES[code] : undefined;
  if (!text) return null;
  const ref = typeof id === "string" && /^[A-Z]{1,3}-\d{3,4}$/.test(id) ? id : "";
  return (
    <div className="notice" role="status">
      <Icon name="check" />
      <span>{text}{ref && <> · <b className="font-mono">{ref}</b></>}</span>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      <Icon name="alert" />
      <span>{message}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-muted">{children}</div>;
}

export function Field({ label, name, error, hint, required, children, full }: {
  label: string; name: string; error?: string; hint?: string; required?: boolean; children: ReactNode; full?: boolean;
}) {
  return (
    <div className={`field ${error ? "invalid" : ""} ${full ? "sm:col-span-2" : ""}`}>
      <label htmlFor={name}>{label}{required && <span className="text-alarm"> *</span>}</label>
      {children}
      {error ? <span className="err" id={`${name}-err`}>{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Options({ list, placeholder }: { list: readonly (string | readonly [string, string])[]; placeholder?: string }) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {list.map((o) => {
        const [v, l] = typeof o === "string" ? [o, o] : o;
        return <option key={v} value={v}>{l}</option>;
      })}
    </>
  );
}
