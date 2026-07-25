import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "calmchore_child_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type ChildSessionPayload = {
  childId: string;
  familyId: string;
  nickname: string;
  accentColour: string;
  iat: number;
};

function getSecret(): string {
  const secret = process.env.CHILD_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "CHILD_SESSION_SECRET is not set — required to sign/verify child login sessions."
    );
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

export function createChildSessionToken(payload: Omit<ChildSessionPayload, "iat">): string {
  const full: ChildSessionPayload = { ...payload, iat: Date.now() };
  const payloadB64 = base64url(JSON.stringify(full));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyChildSessionToken(token: string): ChildSessionPayload | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as ChildSessionPayload;
  } catch {
    return null;
  }
}

export async function setChildSessionCookie(payload: Omit<ChildSessionPayload, "iat">) {
  const token = createChildSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getChildSession(): Promise<ChildSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyChildSessionToken(token);
}

export async function clearChildSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
