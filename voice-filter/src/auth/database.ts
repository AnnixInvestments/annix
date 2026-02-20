import * as bcrypt from "bcrypt";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SALT_ROUNDS = 12;

let db: Database.Database | null = null;

function dbPath(): string {
  return join(homedir(), ".voice-filter", "users.db");
}

export function initDatabase(): void {
  const dir = join(homedir(), ".voice-filter");
  mkdirSync(dir, { recursive: true });

  db = new Database(dbPath());
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      oauth_tokens TEXT DEFAULT NULL,
      created_at TEXT NOT NULL
    )
  `);
}

function ensureDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  oauth_tokens: string | null;
  created_at: string;
}

export async function createUser(email: string, password: string): Promise<User> {
  const database = ensureDb();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date().toISOString();

  const stmt = database.prepare(
    "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
  );
  const result = stmt.run(email.toLowerCase(), hash, now);

  return {
    id: result.lastInsertRowid as number,
    email: email.toLowerCase(),
    password_hash: hash,
    oauth_tokens: null,
    created_at: now,
  };
}

export function findUserByEmail(email: string): User | null {
  const database = ensureDb();
  const stmt = database.prepare("SELECT * FROM users WHERE email = ?");
  const row = stmt.get(email.toLowerCase()) as User | undefined;
  return row ?? null;
}

export function findUserById(id: number): User | null {
  const database = ensureDb();
  const stmt = database.prepare("SELECT * FROM users WHERE id = ?");
  const row = stmt.get(id) as User | undefined;
  return row ?? null;
}

export function saveOAuthToken(userId: number, service: string, token: string): void {
  const database = ensureDb();
  const user = findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tokens: Record<string, string> = user.oauth_tokens
    ? JSON.parse(user.oauth_tokens)
    : {};
  tokens[service] = token;

  const stmt = database.prepare("UPDATE users SET oauth_tokens = ? WHERE id = ?");
  stmt.run(JSON.stringify(tokens), userId);
}

export function oauthTokens(userId: number): Record<string, string> {
  const user = findUserById(userId);
  if (!user || !user.oauth_tokens) {
    return {};
  }
  return JSON.parse(user.oauth_tokens);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
