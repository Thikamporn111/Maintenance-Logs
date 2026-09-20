// Runs before every page request:
// 1. Sets a per-request nonce and a strict Content-Security-Policy (blocks injected scripts).
// 2. Optimistic auth check: no session cookie -> go to /login. The real check happens
//    on the server in each page/action (src/lib/auth/dal.ts); this only saves a round trip.
// 3. Refreshes Supabase session tokens seamlessly if configured.
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

const SESSION_COOKIE = "ml_session";
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/auth/callback"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Optimistic auth check: check for either local demo session cookie or Supabase auth token cookies
  const hasLegacySession = request.cookies.has(SESSION_COOKIE);
  const hasSupabaseSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!isPublic && !hasLegacySession && !hasSupabaseSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React sets style attributes for a few layout values; scripts stay locked down by nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.supabase.co",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co https://accounts.google.com ${supabaseUrl}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' https://*.supabase.co https://accounts.google.com ${supabaseUrl}`.trim(),
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  // Refresh Supabase auth session cookies if user is logged in via Supabase
  if (hasSupabaseSession) {
    const sessionResult = await updateSession(request, response);
    response = sessionResult.response;
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
