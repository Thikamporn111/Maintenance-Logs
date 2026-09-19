"use client";
// Small interactive pieces. Everything they submit is re-checked on the server.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function SubmitButton({ children, className = "btn btn-primary", pendingText = "กำลังบันทึก…" }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/** A form button that asks for confirmation before running a server action. */
export function ConfirmButton({ action, message, children, className = "btn btn-danger", fields = {} }: {
  action: (formData: FormData) => Promise<void>; message: string; children: ReactNode; className?: string; fields?: Record<string, string>;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton className={className} pendingText="กำลังดำเนินการ…">{children}</SubmitButton>
    </form>
  );
}

/** GET filter form that updates the URL as the user types or picks a value. Works as a normal form without JS. */
export function FilterForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(form: HTMLFormElement, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      new FormData(form).forEach((v, k) => { if (typeof v === "string" && v.trim()) params.set(k, v.trim()); });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, delay);
  }

  return (
    <form
      method="get"
      role="search"
      className="flex flex-wrap items-center gap-2"
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        apply(e.currentTarget, target.type === "search" ? 350 : 0);
      }}
      onSubmit={(e) => { e.preventDefault(); apply(e.currentTarget, 0); }}
    >
      {children}
    </form>
  );
}

export type NavItem = { href: string; label: string; short: string; icon: IconName; badge?: number };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="flex flex-1 justify-around gap-0.5 md:flex-col md:justify-start">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium md:flex-none md:flex-row md:gap-2.5 md:px-2.5 md:py-2 md:text-sm ${active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
          >
            <Icon name={it.icon} />
            <span className="hidden md:inline">{it.label}</span>
            <span className="md:hidden">{it.short}</span>
            {!!it.badge && (
              <span className="absolute right-[18%] top-0 rounded-full bg-alarm px-1.5 font-mono text-[11px] leading-[18px] text-white md:static md:ml-auto">{it.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
