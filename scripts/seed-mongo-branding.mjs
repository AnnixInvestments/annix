#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required (the prod Mongo connection string).");
  process.exit(1);
}
const dbName = process.env.MONGO_DATABASE;
if (!dbName) {
  console.error("MONGO_DATABASE is required (the target database name, e.g. annix_production).");
  process.exit(1);
}

const nowIso = new Date().toISOString();

const base = {
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
  createdAt: nowIso,
  updatedAt: nowIso,
};

const brands = [
  {
    _id: "annix-investments",
    ...base,
    description: "Annix Investments — the Annix holding company.",
  },
  {
    _id: "annix-forge",
    ...base,
    tagline: "Quote • Build • Inspect • Deliver",
    description:
      "The industrial project execution platform for quoting, fabrication, quality assurance, and traceability.",
  },
  {
    _id: "annix-insights",
    ...base,
    description: "Market data, news signals, and AI-driven portfolio insights.",
  },
  {
    _id: "annix-rep",
    ...base,
    description: "Mobile sales assistant with smart prospecting and route planning.",
  },
  {
    _id: "annix-orbit",
    ...base,
    tagline: "Hiring • Talent • Compliance",
    description:
      "The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.",
    watermarkOpacity: 0.4,
  },
  {
    _id: "annix-sentinel",
    ...base,
    navbarColor: "#0A1B3D",
    accentOrange: "#1E90FF",
    accentOrangeLight: "#4FA8FF",
    accentOrangeDark: "#1565C0",
    gradientFrom: "#0A1B3D",
    gradientVia: "#06101F",
    gradientTo: "#0A1B3D",
    tagline: "AI-Powered Compliance & Risk Intelligence",
    description:
      "Annix Sentinel is your AI-powered compliance operating system that monitors, protects, and strengthens your business against risk and regulatory non-compliance.",
    logoIconPath: "branding/annix-sentinel/3afd4a73-9976-48e4-9b6b-c34ac4750993.png",
    faviconPath: "branding/annix-sentinel/2c6f0c29-bef7-44f0-9d5c-9cc277ef72b1.png",
  },
];

await mongoose.connect(uri, { dbName });
const collection = mongoose.connection.collection("app_branding");

const before = await collection.countDocuments({});
console.log(`Connected to db "${dbName}". app_branding currently holds ${before} document(s).`);

const results = await Promise.all(
  brands.map(async (brand) => {
    const { _id, ...doc } = brand;
    const result = await collection.updateOne(
      { _id },
      { $setOnInsert: { _id, ...doc } },
      { upsert: true },
    );
    const created = result.upsertedCount > 0;
    return { _id, created };
  }),
);

results.forEach((r) => {
  console.log(`  ${r._id}: ${r.created ? "CREATED" : "left as-is (already present)"}`);
});

const after = await collection.countDocuments({});
console.log(`Done. app_branding now holds ${after} document(s).`);

await mongoose.disconnect();
