import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "@/lib/auth/session";

describe("session cookie signing", () => {
  const future = Date.now() + 60_000;

  it("round-trips a valid token", () => {
    expect(decodeSession(encodeSession({ uid: "u1", exp: future }))).toEqual({ uid: "u1", exp: future });
  });

  it("rejects a token whose payload was changed (privilege escalation attempt)", () => {
    const token = encodeSession({ uid: "u2", exp: future });
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ uid: "u1", exp: future })).toString("base64url")}.${sig}`;
    expect(decodeSession(forged)).toBeNull();
  });

  it("rejects expired, malformed and missing tokens", () => {
    expect(decodeSession(encodeSession({ uid: "u1", exp: Date.now() - 1 }))).toBeNull();
    expect(decodeSession("not-a-token")).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
  });
});
