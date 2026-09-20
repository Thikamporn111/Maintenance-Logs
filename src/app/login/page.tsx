import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { demoLoginEnabled } from "@/lib/auth/credentials";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDictionary, type Locale } from "@/lib/i18n";
import { setLocale, setTheme } from "@/app/actions";
import { Icon } from "@/components/icons";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);
  return { title: t.login.metaTitle };
}

function GhostlampSceneIllustration() {
  return (
    <div className="relative flex w-full max-w-140 items-center justify-center select-none">
      <svg
        viewBox="0 0 640 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-120 drop-shadow-sm"
      >
        {/* Soft Background Clouds / Blobs */}
        <path
          d="M60 260C60 180 140 140 240 150C330 160 380 110 440 130C520 160 560 240 540 330C520 410 450 430 330 430C190 430 60 380 60 260Z"
          fill="#F0F7FF"
          className="dark:opacity-10"
        />
        <path
          d="M160 170C220 120 320 130 360 190C400 250 350 320 280 320C210 320 120 240 160 170Z"
          fill="#E1F0FE"
          className="dark:opacity-10"
        />

        {/* Sparkle / Starburst Dots */}
        <g stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
          <line x1="120" y1="195" x2="120" y2="185" />
          <line x1="120" y1="215" x2="120" y2="225" />
          <line x1="105" y1="205" x2="95" y2="205" />
          <line x1="135" y1="205" x2="145" y2="205" />
          <line x1="110" y1="195" x2="102" y2="187" />
          <line x1="130" y1="215" x2="138" y2="223" />
          <line x1="130" y1="195" x2="138" y2="187" />
          <line x1="110" y1="215" x2="102" y2="223" />
        </g>
        <g stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" opacity="0.7">
          <line x1="365" y1="165" x2="365" y2="157" />
          <line x1="365" y1="181" x2="365" y2="189" />
          <line x1="353" y1="173" x2="345" y2="173" />
          <line x1="377" y1="173" x2="385" y2="173" />
          <line x1="357" y1="165" x2="351" y2="159" />
          <line x1="373" y1="181" x2="379" y2="187" />
          <line x1="373" y1="165" x2="379" y2="159" />
          <line x1="357" y1="181" x2="351" y2="187" />
        </g>
        <g stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" opacity="0.6">
          <line x1="510" y1="315" x2="510" y2="307" />
          <line x1="510" y1="331" x2="510" y2="339" />
          <line x1="498" y1="323" x2="490" y2="323" />
          <line x1="522" y1="323" x2="530" y2="323" />
        </g>

        {/* Reception Desk */}
        <g id="counter">
          {/* Main Desk Block */}
          <path
            d="M120 250H430V405H120V250Z"
            fill="#52A7E7"
          />
          {/* Desk Highlight Strip */}
          <path
            d="M120 250H430V320L120 345V250Z"
            fill="#68B6EE"
          />
          {/* Dark Desk Top Edge */}
          <path
            d="M115 248H435V253H115V248Z"
            fill="#2B7DC2"
          />
          {/* Counter Laptop */}
          <path
            d="M190 234H265V248H190V234Z"
            fill="#2563EB"
            rx="2"
          />
          <path
            d="M185 248H270V251H185V248Z"
            fill="#60A5FA"
          />
        </g>

        {/* Receptionist (Female Character Behind Counter) */}
        <g id="receptionist">
          {/* Hair back */}
          <path
            d="M272 210C268 180 290 170 315 170C345 170 355 190 350 230C340 230 330 225 320 225C310 225 285 228 272 210Z"
            fill="#29264E"
          />
          {/* Face & Neck */}
          <path
            d="M290 200C290 190 298 182 308 182C318 182 326 190 326 200C326 210 318 218 308 218C298 218 290 210 290 200Z"
            fill="#FFD2DA"
          />
          {/* Hair front / bangs */}
          <path
            d="M288 190C295 180 320 175 328 190C325 185 305 182 295 195Z"
            fill="#29264E"
          />
          {/* Smile */}
          <path
            d="M302 206C305 208 310 208 313 206"
            stroke="#29264E"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Shoulders / Pink Blouse */}
          <path
            d="M280 225C280 220 300 218 310 218C320 218 340 220 340 225L348 250H272L280 225Z"
            fill="#FBCFE8"
          />
        </g>

        {/* Small Potted Plant on Desk */}
        <g id="desk-plant">
          <path
            d="M375 233H405L402 250H378L375 233Z"
            fill="#FF6A8B"
            rx="1"
          />
          {/* Leaves */}
          <path
            d="M390 233C385 220 375 222 375 214C383 214 388 223 390 233Z"
            fill="#38BDF8"
          />
          <path
            d="M390 233C392 216 405 218 405 210C397 210 392 220 390 233Z"
            fill="#0284C7"
          />
          <path
            d="M390 233C388 210 394 206 390 196C396 206 394 220 390 233Z"
            fill="#38BDF8"
          />
        </g>

        {/* Tall Potted Tree on Right Floor */}
        <g id="floor-tree">
          {/* Yellow Pot */}
          <path
            d="M445 365H495L488 395H452L445 365Z"
            fill="#FBBF24"
            rx="2"
          />
          {/* Tree Trunk */}
          <path
            d="M468 280H472V365H468V280Z"
            fill="#29264E"
          />
          {/* Big Organic Blue Foliage */}
          <path
            d="M470 200C440 200 420 235 435 270C420 285 425 315 440 330C450 340 460 345 470 345C480 345 490 340 500 330C515 315 520 285 505 270C520 235 500 200 470 200Z"
            fill="#2563EB"
          />
          <path
            d="M470 200C450 200 435 225 445 255C435 270 440 295 450 310C458 320 465 325 470 325V200Z"
            fill="#1D4ED8"
          />
          {/* Delicate Leaf Lines */}
          <path
            d="M470 215C470 280 470 335 470 335"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M470 240C455 235 450 225 450 225"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M470 265C485 260 490 250 490 250"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M470 290C455 285 450 275 450 275"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Customer (Male Character on Left Standing) */}
        <g id="customer">
          {/* Head & Hair */}
          <path
            d="M80 180C75 168 85 165 95 165C108 165 115 170 110 185C105 185 100 182 95 182C90 182 85 185 80 180Z"
            fill="#29264E"
          />
          {/* Face */}
          <path
            d="M88 180C88 175 93 170 99 170C105 170 110 175 110 180C110 187 105 192 99 192C93 192 88 187 88 180Z"
            fill="#FFD2DA"
          />
          {/* Hair Back */}
          <path
            d="M78 178C75 188 80 198 86 198L88 185L78 178Z"
            fill="#29264E"
          />

          {/* Yellow Sweater Upper Body */}
          <path
            d="M65 215C65 205 85 200 100 200C115 200 135 205 135 215L120 265H78L65 215Z"
            fill="#FBBF24"
          />
          {/* Left Arm holding bag */}
          <path
            d="M68 215L48 285L60 288L76 225L68 215Z"
            fill="#F59E0B"
          />
          {/* Right Arm leaning on counter */}
          <path
            d="M125 215L185 245H170L115 225L125 215Z"
            fill="#F59E0B"
          />

          {/* Pink Briefcase */}
          <g id="briefcase">
            <rect x="22" y="285" width="48" height="38" rx="4" fill="#FF5A79" />
            <path
              d="M38 285V277H54V285"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line x1="22" y1="304" x2="70" y2="304" stroke="#E11D48" strokeWidth="1.5" />
          </g>

          {/* Dark Purple / Indigo Pants */}
          <path
            d="M74 265H118L112 390H97L96 315L94 315L92 390H78L74 265Z"
            fill="#29264E"
          />

          {/* Pink Shoes */}
          <path
            d="M72 390H88V397C88 399 86 400 84 400H68L72 390Z"
            fill="#FF5A79"
          />
          <path
            d="M94 390H110V397C110 399 108 400 106 400H90L94 390Z"
            fill="#FF5A79"
          />
        </g>

        {/* Floor Ground Lines */}
        <g stroke="#2F80ED" strokeWidth="1.5" strokeLinecap="round" opacity="0.8">
          <line x1="10" y1="405" x2="600" y2="405" />
          <line x1="85" y1="414" x2="280" y2="414" strokeWidth="1.2" opacity="0.6" />
          <line x1="140" y1="422" x2="220" y2="422" strokeWidth="1.2" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const theme = cookieStore.get("theme")?.value;
  const t = getDictionary(locale);

  const demo = demoLoginEnabled();
  const supabaseReady = isSupabaseConfigured();
  const sp = await searchParams;

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col justify-between font-sans antialiased transition-colors">
      {/* ── Top Header Navigation ── */}
      <header className="flex w-full items-center justify-between px-6 sm:px-12 md:px-16 pt-8 pb-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2F80ED]">
            {t.brandShort}
          </span>
          <span className="text-slate-300 dark:text-slate-700 mx-1">·</span>
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Machine-Maintenance
          </span>
        </div>

        {/* Right Switchers: Language (TH/EN) & Dark/Light Theme */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <form action={setLocale} className="inline-flex items-center">
            <input
              type="hidden"
              name="locale"
              value={locale === "th" ? "en" : "th"}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              aria-label={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
            >
              <Icon name="globe" className="size-3.5 text-[#2F80ED]" />
              <span className={locale === "th" ? "font-bold text-[#2F80ED]" : "text-slate-400"}>
                TH
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className={locale === "en" ? "font-bold text-[#2F80ED]" : "text-slate-400"}>
                EN
              </span>
            </button>
          </form>

          {/* Theme Switcher */}
          <form action={setTheme}>
            <input
              type="hidden"
              name="theme"
              value={theme === "dark" ? "light" : "dark"}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition cursor-pointer"
              aria-label={t.common.themeToggle}
              title={t.common.themeToggle}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} className="size-4" />
            </button>
          </form>
        </div>
      </header>

      {/* ── Main Content: 2-Column Split Layout ── */}
      <main className="my-auto flex w-full max-w-7xl mx-auto flex-1 items-center justify-center px-6 sm:px-12 md:px-16 py-8">
        <div className="grid w-full grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-16">
          {/* Left Column: Reception Scene Illustration */}
          <div className="hidden lg:flex items-center justify-center">
            <GhostlampSceneIllustration />
          </div>

          {/* Right Column: "Welcome Back :)" Form */}
          <div className="flex items-center justify-center lg:justify-start lg:pl-6">
            <LoginForm
              supabaseReady={supabaseReady}
              initialError={sp.error}
              initialMessage={sp.message}
              locale={locale}
            />
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
        &copy; {new Date().getFullYear()} Machine-Maintenance · Plant Telemetry & Maintenance Intelligence
      </footer>
    </div>
  );
}