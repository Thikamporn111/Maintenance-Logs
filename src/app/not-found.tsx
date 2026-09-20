import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, type Locale } from "@/lib/i18n";

export default async function NotFound() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "th";
  const t = getDictionary(locale);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="font-mono text-5xl font-semibold text-muted">404</div>
      <h1 className="text-xl font-semibold">{t.errors.notFoundTitle}</h1>
      <p className="text-muted">{t.errors.notFoundDesc}</p>
      <Link href="/dashboard" className="btn btn-primary">{t.errors.backToDashboard}</Link>
    </div>
  );
}
