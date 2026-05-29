#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DATABASE;
if (!uri || !dbName) {
  console.error("MONGODB_URI and MONGO_DATABASE are required.");
  process.exit(1);
}

const MASTER_BRAND_CODE = "annix-investments";

const PLATFORM_DEFAULTS = {
  navbarColor: "#323288",
  accentOrange: "#FF8A00",
  accentOrangeLight: "#FF9C33",
  accentOrangeDark: "#CC6900",
  gradientFrom: "#1a1a40",
  gradientVia: "#0d0d20",
  gradientTo: "#1a1a40",
  tagline: "",
  description: "",
  watermarkEnabled: true,
  watermarkOpacity: 0.1,
  watermarkMaxSizePx: 880,
  loadingAnimation: "pulse",
};

const fieldEqualsDefault = (doc, field) => {
  const value = doc[field];
  const fallback = PLATFORM_DEFAULTS[field];
  if (field === "watermarkOpacity") {
    const numeric = typeof value === "number" ? value : fallback;
    return Math.abs(numeric - fallback) < 0.001;
  }
  if (value === undefined || value === null) {
    return true;
  }
  return value === fallback;
};

await mongoose.connect(uri, { dbName });
const collection = mongoose.connection.collection("app_branding");

const docs = await collection.find({}).toArray();
const results = await Promise.all(
  docs.map(async (doc) => {
    if (doc._id === MASTER_BRAND_CODE) {
      await collection.updateOne({ _id: doc._id }, { $set: { inheritedFields: [] } });
      return { brand: doc._id, inheritedFields: [] };
    }
    const inheritedFields = Object.keys(PLATFORM_DEFAULTS).filter((field) =>
      fieldEqualsDefault(doc, field),
    );
    await collection.updateOne({ _id: doc._id }, { $set: { inheritedFields } });
    return { brand: doc._id, inheritedFields };
  }),
);

results.forEach((r) => {
  console.log(`  ${r.brand}: inherits ${r.inheritedFields.length} field(s)`);
});
console.log(`Done. Updated ${results.length} brand(s).`);

await mongoose.disconnect();
