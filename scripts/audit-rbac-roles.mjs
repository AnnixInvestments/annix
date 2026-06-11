#!/usr/bin/env node
// READ-ONLY audit of RBAC apps + their roles + per-role user assignments.
import dns from "node:dns";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");
const { MongoClient } = mongoose.mongo;

dns.setServers(["8.8.8.8", "1.1.1.1"]);

function loadEnv() {
  const text = readFileSync(new URL("../annix-backend/.env", import.meta.url), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const uri = env.MONGODB_URI;
  const dbName = env.MONGO_DATABASE || "annix_production";
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db(dbName);

  const apps = await db.collection("apps").find({}).toArray();
  const roles = await db.collection("app_roles").find({}).toArray();
  const access = await db.collection("user_app_access").find({}).toArray();

  const assignmentsByRoleId = access.reduce((acc, a) => {
    if (a.roleId != null) acc.set(a.roleId, (acc.get(a.roleId) ?? 0) + 1);
    return acc;
  }, new Map());

  const rolesByApp = roles.reduce((acc, r) => {
    const list = acc.get(r.appId) ?? [];
    list.push(r);
    acc.set(r.appId, list);
    return acc;
  }, new Map());

  console.log(
    `DB: ${dbName} | apps: ${apps.length} | roles: ${roles.length} | access rows: ${access.length}\n`,
  );

  apps
    .sort((a, b) => String(a.code).localeCompare(String(b.code)))
    .forEach((app) => {
      const list = (rolesByApp.get(app._id) ?? []).sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      );
      console.log(`### ${app.name}  [code=${app.code}, id=${app._id}] — ${list.length} roles`);
      list.forEach((r) => {
        const users = assignmentsByRoleId.get(r._id) ?? 0;
        const def = r.isDefault ? " (default)" : "";
        console.log(`   - ${r.name}  [${r.code}]${def}  · ${users} user(s)`);
      });
      console.log("");
    });

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
