// Signed, httpOnly session cookie (HMAC-SHA256). Stateless: holds only the user id and expiry.
// When Supabase Auth is added, replace this file with @supabase/ssr's cookie session.
import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ml_session";
const MAX_AGE_S = 8 * 60 * 60; // one shift

type Payload = { uid: string; exp: number };
const g = globalThis as unknown as { __mlDevSecret?: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters. Set it in the environment (never commit it).");
  }
  // Development only: a random secret per server process, so sessions reset on restart.
  return (g.__mlDevSecret ??= randomBytes(32).toString("hex"));
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest();

export function encodeSession(p: Payload): string {
  const body = b64(JSON.stringify(p));
  return `${body}.${b64(sign(body))}`;
}

export function decodeSession(token: string | undefined, now = Date.now()): Payload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof p.uid !== "string" || typeof p.exp !== "number" || p.exp < now) return null;
    return p;
  } catch {
    return null;
  }
}

export async function createSession(uid: string) {
  const jar = await cookies();
  jar.set(COOKIE, encodeSession({ uid, exp: Date.now() + MAX_AGE_S * 1000 }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function readSession(): Promise<Payload | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
