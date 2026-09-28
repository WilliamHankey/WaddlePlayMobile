/**
 * Password hashing and JWT signing using only WebCrypto, so the Worker needs
 * no native modules. Replaces bcrypt (unavailable on Workers) and PyJWT.
 *
 * Stored password format: pbkdf2_sha256$<iterations>$<saltB64>$<hashB64>
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32;
const SALT_BYTES = 16;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return fromBase64(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    PBKDF2_KEYLEN * 8,
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const bits = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return [
    "pbkdf2_sha256",
    String(PBKDF2_ITERATIONS),
    toBase64(salt),
    toBase64(new Uint8Array(bits)),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const [scheme, iterRaw, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2_sha256") return false;
    const iterations = Number(iterRaw);
    if (!Number.isInteger(iterations) || iterations < 1) return false;
    const bits = await pbkdf2(password, fromBase64(saltB64), iterations);
    return timingSafeEqual(new Uint8Array(bits), fromBase64(hashB64));
  } catch {
    return false;
  }
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

/** Mirrors make_token(): HS256, 7 day expiry, claims {sub, email, iat, exp}. */
export async function signToken(
  secret: string,
  userId: string,
  email: string,
  expMinutes: number,
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: userId,
    email,
    iat: nowSeconds,
    exp: nowSeconds + expMinutes * 60,
  };
  const encodedHeader = toBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = toBase64Url(await hmac(secret, signingInput));
  return `${signingInput}.${signature}`;
}

export async function verifyToken(
  secret: string,
  token: string,
): Promise<{ sub: string; email: string; exp: number } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const expected = toBase64Url(await hmac(secret, `${encodedHeader}.${encodedPayload}`));
    if (!timingSafeEqual(new TextEncoder().encode(signature), new TextEncoder().encode(expected))) {
      return null;
    }
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as { sub?: string; email?: string; exp?: number };
    if (!payload.sub) return null;
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
    return {
      sub: payload.sub,
      email: payload.email ?? "",
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}
