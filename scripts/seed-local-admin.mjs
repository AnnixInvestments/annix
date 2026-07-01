#!/usr/bin/env node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
require("dotenv").config({
  path: fileURLToPath(new URL("../annix-backend/.env", import.meta.url)),
  quiet: true,
});

const { setServers } = require("node:dns");
if (process.env.MONGO_DNS_SERVERS) {
  setServers(
    process.env.MONGO_DNS_SERVERS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

const mongoose = require("mongoose");

const ADMIN_PASSWORD_HASH = "$2b$10$mb1Ig2ezJ2Og.cT4xZsXKO4U/Wp6q9F0gqVPHEX8MNopyECJEMcW.";
const ADMINS = ["admin@annix.co.za", "info@annix.co.za"];

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DATABASE;
  if (!uri || !dbName) {
    console.error("MONGODB_URI and MONGO_DATABASE are required (from annix-backend/.env)");
    process.exit(1);
  }
  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db;
  const now = new Date();

  const ADMIN_ROLE_ID = 7;
  await db.collection("user_role").updateOne(
    { _id: ADMIN_ROLE_ID },
    {
      $set: { name: "admin", updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  console.log(`Seeding admins into ${dbName}`);
  console.log(`  role ✓ admin (_id:${ADMIN_ROLE_ID})`);

  const seeded = await ADMINS.reduce(async (acc, email, index) => {
    await acc;
    const userId = index + 1;
    await db.collection("user").updateOne(
      { email },
      {
        $set: {
          email,
          username: email,
          passwordHash: ADMIN_PASSWORD_HASH,
          status: "active",
          emailVerified: true,
          updatedAt: now,
        },
        $setOnInsert: { _id: userId, createdAt: now },
      },
      { upsert: true },
    );
    const userDoc = await db.collection("user").findOne({ email });
    await db
      .collection("user_roles_user_role")
      .updateOne(
        { userId: userDoc._id, userRoleId: ADMIN_ROLE_ID },
        { $set: { userId: userDoc._id, userRoleId: ADMIN_ROLE_ID } },
        { upsert: true },
      );
    console.log(`  user ✓ ${email} (_id:${userDoc._id}) -> admin`);
  }, Promise.resolve());

  void seeded;
  await mongoose.disconnect();
  console.log("Done. Dev password verification is disabled, so any password works.");
}

run().catch((error) => {
  console.error("ERR:", error.message);
  process.exit(1);
});
