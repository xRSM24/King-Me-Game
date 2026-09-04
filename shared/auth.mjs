import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const TOKEN_DAYS = 120;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const STUDIO_EMAIL = "ravioli2332@gmail.com";

export function accountSecret() {
  return (
    process.env.KINGME_ACCOUNT_SECRET ||
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    "kingme-local-dev-secret"
  );
}

export function studioEmail() {
  const raw = (process.env.KINGME_STUDIO_EMAIL || STUDIO_EMAIL).trim().toLowerCase();
  return raw || STUDIO_EMAIL;
}

export function normalizeEmail(raw) {
  const email = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (email.length < 5 || email.length > 80) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  if (email.includes("..")) return "";
  return email;
}

export function emailKey(email) {
  return createHash("sha256").update(`kingme-email:${email}`).digest("hex");
}

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 32).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  try {
    const next = scryptSync(password, salt, 32);
    const prev = Buffer.from(String(hash), "hex");
    if (next.length !== prev.length) return false;
    return timingSafeEqual(next, prev);
  } catch {
    return false;
  }
}

export function checkPassword(raw) {
  const password = String(raw ?? "");
  if (password.length < PASSWORD_MIN) return `Need ${PASSWORD_MIN} or more characters.`;
  if (password.length > PASSWORD_MAX) return "That password is too long.";
  if (!/\S/.test(password)) return "Need a real password.";
  return "";
}

export function makeToken(id, secret = accountSecret()) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * TOKEN_DAYS;
  const body = `${id}.${exp}`;
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function readToken(token, secret = accountSecret()) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return "";
  const [id, exp, sig] = parts;
  if (!id || !exp || !sig) return "";
  const body = `${id}.${exp}`;
  const expect = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "";
  if (!Number.isFinite(Number(exp)) || Number(exp) < Date.now()) return "";
  return id;
}

export function bearerToken(header) {
  const raw = String(header ?? "");
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return (m?.[1] || raw).trim();
}
