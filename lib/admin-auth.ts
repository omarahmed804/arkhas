/**
 * Minimal password protection for /admin (server-side only).
 *
 * - The password comes from the ADMIN_PASSWORD environment variable
 *   (falls back to "arkhas2026" for local testing — SET YOUR OWN on Vercel!).
 * - After a correct login we store an HMAC token in an httpOnly cookie.
 *   The token is derived from the password, so it can't be forged, and
 *   changing ADMIN_PASSWORD logs everyone out.
 */
export const ADMIN_COOKIE = "arkhas_admin";
export const DEFAULT_ADMIN_PASSWORD = "arkhas2026";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

/** HMAC-SHA256(password, "arkhas-admin-session") as hex — works in Node and Edge runtimes. */
export async function sessionToken(password = getAdminPassword()): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("arkhas-admin-session"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  return safeEqual(cookieValue, await sessionToken());
}
