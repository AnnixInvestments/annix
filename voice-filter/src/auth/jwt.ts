import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import * as jwt from "jsonwebtoken";

const TOKEN_EXPIRY = "7d";

function secretPath(): string {
  return join(homedir(), ".voice-filter", "jwt-secret.txt");
}

function loadOrCreateSecret(): string {
  const path = secretPath();

  if (existsSync(path)) {
    return readFileSync(path, "utf-8").trim();
  }

  const dir = join(homedir(), ".voice-filter");
  mkdirSync(dir, { recursive: true });

  const secret = randomBytes(64).toString("hex");
  writeFileSync(path, secret, { mode: 0o600 });
  return secret;
}

let cachedSecret: string | null = null;

function secret(): string {
  if (!cachedSecret) {
    cachedSecret = loadOrCreateSecret();
  }
  return cachedSecret;
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, secret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const payload = jwt.verify(token, secret()) as { userId: number };
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function extractTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("vf_token="));

  if (!match) {
    return null;
  }

  return match.split("=")[1] ?? null;
}
