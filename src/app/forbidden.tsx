import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, type Locale } from "@/lib/i18n";

export default async function Forbidden() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "th";
  const t = getDictionary(locale);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="font-mono text-5xl font-semibold text-alarm">403</div>
      <h1 className="text-xl font-semibold">{t.errors.forbiddenTitle}</h1>
      <p className="max-w-[36em] text-muted">{t.errors.forbiddenDesc}</p>
      <Link href="/dashboard" className="btn btn-primary">{t.errors.backToDashboard}</Link>
    </div>
  );
}
