import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "superapp_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type Session = { username: string };

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET must be set to at least 16 characters (see .env.example)",
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyCredentials(
  username: unknown,
  password: unknown,
): boolean {
  const envUser = process.env.AUTH_USERNAME;
  const envPass = process.env.AUTH_PASSWORD;
  if (!envUser || !envPass) return false;
  if (typeof username !== "string" || typeof password !== "string") {
    return false;
  }
  return safeEqual(username, envUser) && safeEqual(password, envPass);
}

export async function createSession(username: string): Promise<void> {
  const payload = JSON.stringify({
    username,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const token = `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_SECURE_COOKIE === "true",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!safeEqual(signature, sign(payload))) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  const { username, exp } = (parsed ?? {}) as {
    username?: unknown;
    exp?: unknown;
  };
  if (
    typeof username !== "string" ||
    typeof exp !== "number" ||
    exp < Date.now()
  ) {
    return null;
  }
  return { username };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
