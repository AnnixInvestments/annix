#!/usr/bin/env node
// Shared DB-environment awareness for all Claude sessions + humans.
// Reports the live main + Orbit DB targets the swarm's .env points at,
// classifies them (PROD/LOCAL/etc.), flags prod-pointing and swarm-vs-.env
// drift, and records the state so the NEXT run (any session) detects changes.
//
// Run:  node scripts/db-env.mjs
// Read-only except for the state file it writes (.claude-swarm/db-env-state.json).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

// Prefer the swarm's real .env (the main Annix-sync checkout). A worktree copy
// of this script falls back to that known location, since worktrees have no .env.
const envCandidates = [
  resolve(scriptDir, "../annix-backend/.env"),
  "C:/Users/andy/Documents/Annix-sync/annix-backend/.env",
];
const envPath = envCandidates.find((p) => existsSync(p));

if (!envPath) {
  console.error("db-env: could not locate annix-backend/.env in any known checkout");
  process.exit(2);
}

const repoRoot = dirname(dirname(envPath));
const stateDir = join(repoRoot, ".claude-swarm");
const statePath = join(stateDir, "db-env-state.json");
const logPath = join(repoRoot, "logs", "backend.log");

const env = readFileSync(envPath, "utf8");
const read = (key) => {
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : "";
};
const hostOf = (uri) => {
  const m = uri.match(/@([^/?]+)/);
  return m ? m[1] : "";
};

const mainHost = hostOf(read("MONGODB_URI"));
const mainDb = read("MONGO_DATABASE");
const orbitHost = hostOf(read("ORBIT_MONGODB_URI") || read("MONGODB_URI"));
const orbitDb = read("ORBIT_MONGO_DATABASE") || read("MONGO_DATABASE");

function classify(host, db) {
  const h = (host || "").toLowerCase();
  const d = (db || "").toLowerCase();
  if (!h) return { label: "UNSET", prod: false };
  if (h.includes("apxdmbt")) {
    if (d === "annix_production") return { label: "PROD — main cluster", prod: true };
    return { label: `main cluster / ${db}`, prod: false };
  }
  if (h.includes("g95w61s")) return { label: `STAGING cluster / ${db}`, prod: false };
  if (h.includes("yh1tprr")) return { label: `TEST cluster / ${db}`, prod: false };
  if (h.includes("oclp36u")) {
    if (d === "orbit_production") return { label: "PROD — Orbit cluster", prod: true };
    if (d === "orbit_local") return { label: "LOCAL — Orbit cluster", prod: false };
    return { label: `Orbit cluster / ${db}`, prod: false };
  }
  return { label: `unknown cluster (${host}) / ${db}`, prod: false };
}

const mainClass = classify(mainHost, mainDb);
const orbitClass = classify(orbitHost, orbitDb);

// Best-effort: what DB is the RUNNING swarm actually on? It caches .env at boot
// (nest --watch does not reload .env), so it can differ from .env above.
let runtimeMainDb = null;
if (existsSync(logPath)) {
  try {
    const buf = readFileSync(logPath, "utf8");
    const tail = buf.slice(-3_000_000).replace(/\x1b\[[0-9;]*m/g, "");
    const matches = [...tail.matchAll(/protected database "([^"]+)"/g)];
    if (matches.length > 0) runtimeMainDb = matches[matches.length - 1][1];
  } catch {
    runtimeMainDb = null;
  }
}

const now = new Date().toISOString();
const current = { mainHost, mainDb, orbitHost, orbitDb };

let prev = null;
if (existsSync(statePath)) {
  try {
    prev = JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    prev = null;
  }
}

const changes = [];
if (prev) {
  if (prev.mainHost !== mainHost || prev.mainDb !== mainDb) {
    changes.push(`MAIN : ${prev.mainHost}/${prev.mainDb}  ->  ${mainHost}/${mainDb}`);
  }
  if (prev.orbitHost !== orbitHost || prev.orbitDb !== orbitDb) {
    changes.push(`ORBIT: ${prev.orbitHost}/${prev.orbitDb}  ->  ${orbitHost}/${orbitDb}`);
  }
}

console.log("================= DB ENV CHECK =================");
console.log(`.env  : ${envPath}`);
console.log(
  `MAIN  : ${mainHost} / ${mainDb}   ->  ${mainClass.label}${mainClass.prod ? "  [!] PRODUCTION" : ""}`,
);
console.log(
  `ORBIT : ${orbitHost} / ${orbitDb}   ->  ${orbitClass.label}${orbitClass.prod ? "  [!] PRODUCTION" : ""}`,
);
if (runtimeMainDb) {
  const drift = runtimeMainDb !== mainDb;
  console.log(
    `SWARM : running main db = ${runtimeMainDb}   ${drift ? "[!] DRIFT — swarm differs from .env (restart swarm to pick up .env)" : "[matches .env]"}`,
  );
} else {
  console.log("SWARM : runtime db unknown (no recent signal in backend.log)");
}

if (changes.length > 0) {
  console.log("-----------------------------------------------");
  console.log(`[!] ENV CHANGED since last check (${prev.checkedAt}):`);
  for (const c of changes) console.log(`     ${c}`);
} else if (prev) {
  console.log(`-- no change since last check (${prev.checkedAt}) --`);
} else {
  console.log("-- first recorded check --");
}

if (mainClass.prod || orbitClass.prod) {
  console.log("===============================================");
  console.log("[!] A connection points at PRODUCTION — direct writes/migrations hit live data.");
}
console.log("===============================================");

if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
writeFileSync(statePath, `${JSON.stringify({ ...current, checkedAt: now }, null, 2)}\n`);
