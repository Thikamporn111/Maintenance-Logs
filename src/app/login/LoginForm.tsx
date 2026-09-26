"use client";

import { useActionState, useState } from "react";
import { login, signInWithGoogle } from "./actions";
import { FormError } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { Locale } from "@/lib/i18n";

function GoogleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginForm({
  supabaseReady,
  initialError,
  initialMessage,
  locale = "th",
}: {
  supabaseReady: boolean;
  initialError?: string;
  initialMessage?: string;
  locale?: Locale;
}) {
  const [loginState, loginAction, isPending] = useActionState(login, {});
  const [email, setEmail] = useState(loginState.values?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clearedErrors, setClearedErrors] = useState<{ email?: boolean; password?: boolean }>({});

  const generalError = initialError || loginState.message;
  const isEn = locale === "en";
  const isEmailFilled = email.trim().length > 3 && email.includes("@");

  const [prevLoginState, setPrevLoginState] = useState(loginState);
  if (loginState !== prevLoginState) {
    setPrevLoginState(loginState);
    setClearedErrors({});
  }

  const hasEmailError = Boolean(loginState.errors?.email && !clearedErrors.email);
  const hasPasswordError = Boolean(loginState.errors?.password && !clearedErrors.password);

  // ข้อความ Placeholder: ถ้ามี Error ให้แสดงข้อความ Error ในช่องกรอกแทน
  const emailPlaceholder = hasEmailError
    ? loginState.errors?.email
    : isEn
    ? "Enter your email"
    : "กรอกอีเมลของคุณ";

  const passwordPlaceholder = hasPasswordError
    ? loginState.errors?.password
    : isEn
    ? "Enter your password"
    : "กรอกรหัสผ่านของคุณ";

  return (
    <div className="flex w-full max-w-105 flex-col">
      {/* ── Heading ── */}
      <div className="mb-6">
        <h1
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white"
          style={{ color: "var(--ink)" }}
        >
          Welcome Back :)
        </h1>
        <p
          className="mt-3 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          {isEn
            ? "Please log in with your email and password"
            : "กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน"}{" "}
          <span className="inline-block text-amber-500 text-sm">🔔</span>
        </p>
      </div>

      {/* ── Status Alerts ── */}
      {initialMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
          <Icon name="check" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{initialMessage}</span>
        </div>
      )}

      {generalError && (
        <div className="mb-4">
          <FormError message={generalError} />
        </div>
      )}

      {/* ── Ghostlamp Stacked Card Inputs (Single Container) ── */}
      <form action={loginAction} noValidate>
        <div
          className={`overflow-hidden rounded-xl border transition-colors ${
            hasEmailError || hasPasswordError
              ? "border-rose-400/80 dark:border-rose-500/60"
              : "border-slate-200 dark:border-slate-700/80"
          } bg-[#F4F6F9] dark:bg-slate-800/80 shadow-2xs`}
        >
          {/* Row 1: Email Address */}
          <div className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800">
            {/* Email outline icon */}
            <div
              className={`flex size-7 shrink-0 items-center justify-center transition-colors ${
                hasEmailError ? "text-rose-500" : "text-slate-400"
              }`}
            >
              <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <polyline points="3 7 12 13 21 7" />
              </svg>
            </div>

            <div className="flex flex-1 flex-col min-w-0">
              <label
                htmlFor="email"
                className={`text-[11px] font-medium transition-colors select-none ${
                  hasEmailError ? "text-rose-500 font-semibold" : "text-slate-400 dark:text-slate-400"
                }`}
              >
                {isEn ? "Email Address" : "Email Address"}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (hasEmailError) setClearedErrors((prev) => ({ ...prev, email: true }));
                }}
                placeholder={emailPlaceholder}
                aria-invalid={hasEmailError}
                className={`w-full bg-transparent text-sm font-medium text-slate-800 dark:text-white outline-none transition-colors ${
                  hasEmailError
                    ? "placeholder:text-rose-500 placeholder:font-normal placeholder:opacity-90"
                    : "placeholder:text-slate-300"
                }`}
              />
            </div>

            {/* Ghostlamp Green Checkmark Circle on Email */}
            <div className="shrink-0 pl-1">
              {isEmailFilled && !hasEmailError ? (
                <span
                  className="flex size-5 items-center justify-center rounded-full bg-[#10B981] text-white shadow-xs transition-all"
                  title="Email formatted correctly"
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : (
                <span className="size-5 block" />
              )}
            </div>
          </div>

          {/* Dividing Border between Email and Password */}
          <div className="h-px w-full bg-slate-200/80 dark:bg-slate-700/80" />

          {/* Row 2: Password */}
          <div className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800">
            {/* Lock outline icon */}
            <div
              className={`flex size-7 shrink-0 items-center justify-center transition-colors ${
                hasPasswordError ? "text-rose-500" : "text-slate-400"
              }`}
            >
              <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>

            <div className="flex flex-1 flex-col min-w-0">
              <label
                htmlFor="password"
                className={`text-[11px] font-medium transition-colors select-none ${
                  hasPasswordError ? "text-rose-500 font-semibold" : "text-slate-400 dark:text-slate-400"
                }`}
              >
                {isEn ? "Password" : "Password"}
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (hasPasswordError) setClearedErrors((prev) => ({ ...prev, password: true }));
                }}
                placeholder={passwordPlaceholder}
                aria-invalid={hasPasswordError}
                className={`w-full bg-transparent text-sm font-medium tracking-wide text-slate-800 dark:text-white outline-none transition-colors ${
                  hasPasswordError
                    ? "placeholder:text-rose-500 placeholder:font-normal placeholder:opacity-90"
                    : "placeholder:text-slate-300"
                }`}
              />
            </div>

            {/* Ghostlamp Eye Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="flex size-7 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} className="size-4" />
            </button>
          </div>
        </div>

        {/* ── Primary Submit Button ── */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-[#2F80ED] hover:bg-[#256FD1] text-white font-medium py-3 px-8 text-sm shadow-md shadow-blue-500/25 transition-all duration-150 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (isEn ? "Logging in…" : "กำลังเข้าสู่ระบบ…") : "Login Now"}
          </button>
        </div>
      </form>

      {/* ── Social Login with Google on the right of 'Or continue with' ── */}
      <div className="mt-8 flex items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400 select-none">
          {isEn ? "Or continue with" : "หรือเข้าสู่ระบบด้วย"}
        </span>
        <form action={signInWithGoogle} className="inline-flex">
          <button
            type="submit"
            disabled={!supabaseReady}
            title={supabaseReady ? "Sign in with Google" : "Supabase not configured"}
            className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            aria-label="Sign in with Google"
          >
            <GoogleIcon className="size-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}