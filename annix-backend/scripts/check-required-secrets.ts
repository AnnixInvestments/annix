import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env" });

type SecretCheck = { name: string; required: boolean; note: string };

const isProduction = process.env.NODE_ENV === "production";
const whatsAppGateEnabled = process.env.ORBIT_WHATSAPP_QUOTA_GATE === "true";
const usesS3 = (process.env.STORAGE_TYPE ?? "s3") === "s3";

function present(name: string): boolean {
  const value = process.env[name];
  return value != null && value.trim() !== "";
}

const hardRequired: SecretCheck[] = [
  { name: "MONGODB_URI", required: true, note: "core MongoDB cluster (boot throws if missing)" },
  {
    name: "MONGO_DATABASE",
    required: true,
    note: "core MongoDB database (boot throws if missing)",
  },
  {
    name: "ORBIT_MONGODB_URI",
    required: isProduction,
    note: "Orbit MongoDB cluster (boot throws in production)",
  },
  {
    name: "ORBIT_MONGO_DATABASE",
    required: isProduction,
    note: "Orbit MongoDB database (boot throws in production)",
  },
  {
    name: "JWT_SECRET",
    required: isProduction,
    note: "auth signing key (boot throws in production if missing or <32 chars)",
  },
  {
    name: "FIELD_ENCRYPTION_KEY",
    required: isProduction,
    note: "PII field encryption key (boot throws in production if not 64 hex chars)",
  },
  {
    name: "WHATSAPP_APP_SECRET",
    required: whatsAppGateEnabled,
    note: "boot throws when ORBIT_WHATSAPP_QUOTA_GATE=true",
  },
];

const recommended: SecretCheck[] = [
  {
    name: "GEMINI_API_KEY",
    required: false,
    note: "AI extraction/chat fails on first use without it",
  },
  { name: "AWS_ACCESS_KEY_ID", required: false, note: "S3 uploads fail on first use without it" },
  {
    name: "AWS_SECRET_ACCESS_KEY",
    required: false,
    note: "S3 uploads fail on first use without it",
  },
  { name: "AWS_S3_BUCKET", required: false, note: "S3 uploads fail on first use without it" },
  { name: "AWS_REGION", required: false, note: "S3 uploads fail on first use without it" },
  { name: "SMTP_HOST", required: false, note: "email degrades to console logging without it" },
  { name: "SMTP_USER", required: false, note: "email degrades to console logging without it" },
  { name: "SMTP_PASS", required: false, note: "email degrades to console logging without it" },
];

const activeHardRequired = hardRequired.filter((check) => check.required);
const missingHard = activeHardRequired.filter((check) => !present(check.name));
const missingRecommended = (
  usesS3 ? recommended : recommended.filter((check) => !check.name.startsWith("AWS_"))
).filter((check) => !present(check.name));

console.log(
  `Secret pre-flight (NODE_ENV=${process.env.NODE_ENV ?? "unset"}, whatsAppGate=${whatsAppGateEnabled}, storage=${process.env.STORAGE_TYPE ?? "s3"})`,
);
console.log(
  `Hard-required present: ${activeHardRequired.length - missingHard.length}/${activeHardRequired.length}`,
);

if (missingRecommended.length > 0) {
  console.warn(
    "WARNING — recommended secrets missing (deploy continues; features degrade until set):",
  );
  missingRecommended.forEach((check) => console.warn(`  - ${check.name}: ${check.note}`));
}

if (missingHard.length > 0) {
  console.error("FATAL — required secrets missing for this environment; the app would not boot:");
  missingHard.forEach((check) => console.error(`  - ${check.name}: ${check.note}`));
  console.error("Set them with: fly secrets set <KEY>=<value> -a <app-name>");
  process.exit(1);
}

console.log("All hard-required secrets are present.");
