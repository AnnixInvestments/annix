/**
 * S2 — Orbit identity backfill + verification (ADR-0001 migration phases M1, M2).
 *
 * Copies Orbit identities OUT of the core `user` collection INTO the four
 * physically-separate per-module identity collections (S0/S1 scaffold),
 * PRESERVING `_id`, then populates `identity_registry` and seeds the shared
 * `orbit_identity` counter to the global high-water mark.
 *
 * Why a standalone script and NOT a migrate-mongo migration:
 *   - It is CROSS-CLUSTER (reads core `user`, writes the Orbit cluster); the
 *     migrate-mongo runner is bound to a single database per config.
 *   - It must be DRY-RUN BY DEFAULT with an explicit apply gate; migrate-mongo
 *     migrations auto-execute writes on deploy/boot with no flags.
 * It is therefore wired into NO runner and never runs automatically.
 *
 * Reversibility (M1 guarantee): source `user` rows are left UNTOUCHED. Rollback =
 * drop the four `orbit_*_identities` collections + the `identity_registry`
 * entries this wrote + reset (or delete) the `orbit_identity` counter doc. The
 * core `user` collection — the system of record until cut-over — is never mutated.
 *
 * Invoke (dry-run, no writes, prints the plan):
 *   ts-node --transpile-only -r tsconfig-paths/register scripts/migrate-orbit-identities.ts
 * Apply (writes, then runs the M2 verification gate):
 *   APPLY=1 ts-node ... scripts/migrate-orbit-identities.ts --apply
 * Verify only (standalone M2 gate, read-only):
 *   ts-node ... scripts/migrate-orbit-identities.ts --verify
 *
 * Connections come from env exactly as the app resolves them — core via
 * MONGODB_URI / MONGO_DATABASE, Orbit via ORBIT_MONGODB_URI /
 * ORBIT_MONGO_DATABASE. No cluster is ever hardcoded.
 */
import { config as dotenvConfig } from "dotenv";
import { isNumber, isString } from "es-toolkit/compat";
import mongoose, { type mongo } from "mongoose";
import {
  CORE_USER_COLLECTION,
  ORBIT_IDENTITY_COLLECTIONS,
  ORBIT_IDENTITY_COUNTER_KEY,
} from "../src/annix-orbit/identity/repositories/orbit-identity.repository.mongo";
import { now } from "../src/lib/datetime";

type Doc = Record<string, unknown>;

// `counters` collection + key match MongoCrudRepository's id sequencing
// (lib/persistence/mongo-crud-repository.ts) so newly minted ids continue the
// same shared `orbit_identity` sequence the live repos draw from.
const COUNTERS_COLLECTION = "counters";

// Mirrors @Schema({ collection: "identity_registry" }) from the S1 registry store.
const IDENTITY_REGISTRY_COLLECTION = "identity_registry";
const REGISTRY_APP = "orbit";

// FK collections whose `userId` must keep resolving to a (now-migrated) identity.
const FK_COLLECTIONS_ORBIT = ["cv_assistant_profiles"] as const;
const FK_COLLECTIONS_CORE = ["user_app_access", "passkeys"] as const;
const FK_SAMPLE_LIMIT = 50;

interface ScopeMapping {
  scope: string;
  module: string;
  collection: string;
}

// scope → module → target collection. Matches ORBIT_SCOPE_BY_USER_TYPE in
// annix-orbit/services/auth.service.ts. Any other `orbit:*` scope is quarantined,
// never guessed — mirroring the fallbackUserType refusal in that service.
const ORBIT_SCOPE_MAPPINGS: readonly ScopeMapping[] = [
  { scope: "orbit:company", module: "company", collection: "orbit_company_identities" },
  { scope: "orbit:seeker", module: "seeker", collection: "orbit_seeker_identities" },
  { scope: "orbit:recruiter", module: "recruiter", collection: "orbit_recruiter_identities" },
  { scope: "orbit:student", module: "student", collection: "orbit_student_identities" },
];

// Auth fields copied 1:1 from `user` (emailLower is derived; module + markers added).
const COPIED_USER_FIELDS = [
  "email",
  "passwordHash",
  "firstName",
  "lastName",
  "emailVerified",
  "emailVerificationToken",
  "emailVerificationExpires",
  "resetPasswordToken",
  "resetPasswordExpires",
  "oauthProvider",
  "oauthId",
  "status",
  "lastLoginAt",
  "createdAt",
  "updatedAt",
] as const;

export interface OrbitIdentityMigrationSummary {
  apply: boolean;
  perModule: Record<string, number>;
  quarantine: Array<{ id: number; appScope: string | null }>;
  registryRows: number;
  counterKey: string;
  counterBefore: number | null;
  counterToSet: number;
  totalToMigrate: number;
}

export interface VerificationCheck {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
}

export interface VerificationResult {
  checks: VerificationCheck[];
  ok: boolean;
}

function mappingForScope(scope: string | null): ScopeMapping | null {
  if (!scope) {
    return null;
  }
  return ORBIT_SCOPE_MAPPINGS.find((mapping) => mapping.scope === scope) ?? null;
}

function emailLowerOf(user: Doc): string {
  return String(user.email ?? "")
    .trim()
    .toLowerCase();
}

function fetchOrbitUsers(coreDb: mongo.Db): Promise<Doc[]> {
  // Server-side filter to the `orbit:*` family only; non-Orbit rows are untouched.
  return coreDb
    .collection(CORE_USER_COLLECTION)
    .find({ appScope: { $regex: "^orbit:" } } as never)
    .toArray();
}

async function maxNumericId(collection: mongo.Collection): Promise<number> {
  const numericId = { _id: { $type: "number" } } as never;
  const top = await collection.find(numericId).sort({ _id: -1 }).limit(1).toArray();
  const value = top.length > 0 ? Number((top[0] as { _id: unknown })._id) : 0;
  return Number.isFinite(value) ? value : 0;
}

/** Global high-water mark across core `user` + the four identity collections. */
export async function computeGlobalMaxId(coreDb: mongo.Db, orbitDb: mongo.Db): Promise<number> {
  const maxima = await Promise.all([
    maxNumericId(coreDb.collection(CORE_USER_COLLECTION)),
    ...ORBIT_IDENTITY_COLLECTIONS.map((name) => maxNumericId(orbitDb.collection(name))),
  ]);
  return maxima.reduce((highest, value) => (value > highest ? value : highest), 0);
}

function buildIdentitySet(user: Doc, module: string): Doc {
  const set: Doc = { module, emailLower: emailLowerOf(user) };
  for (const field of COPIED_USER_FIELDS) {
    if (user[field] !== undefined) {
      set[field] = user[field];
    }
  }
  return set;
}

async function upsertIdentity(
  orbitDb: mongo.Db,
  collection: string,
  module: string,
  user: Doc,
): Promise<void> {
  // upsert on `_id` (preserved) → idempotent, never duplicates. The copied auth
  // fields refresh on re-run ($set); the audit markers are written once ($setOnInsert).
  await orbitDb.collection(collection).updateOne(
    { _id: user._id } as never,
    {
      $set: buildIdentitySet(user, module),
      $setOnInsert: { migratedFrom: "user", migratedAt: now().toJSDate() },
    } as never,
    { upsert: true },
  );
}

async function upsertRegistry(
  orbitDb: mongo.Db,
  userId: number,
  module: string,
  emailLower: string,
): Promise<void> {
  // Mirrors MongoIdentityRegistryRepository.upsert (S1): keyed on the global userId.
  await orbitDb
    .collection(IDENTITY_REGISTRY_COLLECTION)
    .updateOne(
      { _id: userId } as never,
      { $set: { app: REGISTRY_APP, module, emailLower } } as never,
      { upsert: true },
    );
}

async function readCounter(orbitDb: mongo.Db): Promise<number | null> {
  const doc = await orbitDb
    .collection(COUNTERS_COLLECTION)
    .findOne({ _id: ORBIT_IDENTITY_COUNTER_KEY } as never);
  return doc && isNumber((doc as Doc).seq) ? ((doc as Doc).seq as number) : null;
}

/**
 * M1 backfill. With `apply: false` (default) computes the plan and writes NOTHING.
 * With `apply: true` upserts identities (preserving `_id`), populates the registry
 * and raises the `orbit_identity` counter. Idempotent in both modes.
 */
export async function runOrbitIdentityMigration(
  coreDb: mongo.Db,
  orbitDb: mongo.Db,
  options: { apply: boolean },
): Promise<OrbitIdentityMigrationSummary> {
  const users = await fetchOrbitUsers(coreDb);

  const perModule: Record<string, number> = { company: 0, seeker: 0, recruiter: 0, student: 0 };
  const quarantine: Array<{ id: number; appScope: string | null }> = [];
  const planned: Array<{ user: Doc; mapping: ScopeMapping }> = [];

  for (const user of users) {
    const scope = isString(user.appScope) ? user.appScope : null;
    const mapping = mappingForScope(scope);
    if (!mapping) {
      quarantine.push({ id: Number(user._id), appScope: scope });
      continue;
    }
    planned.push({ user, mapping });
    perModule[mapping.module] += 1;
  }

  if (options.apply) {
    for (const { user, mapping } of planned) {
      await upsertIdentity(orbitDb, mapping.collection, mapping.module, user);
      await upsertRegistry(orbitDb, Number(user._id), mapping.module, emailLowerOf(user));
    }
  }

  const globalMax = await computeGlobalMaxId(coreDb, orbitDb);
  const counterBefore = await readCounter(orbitDb);
  // Only ever raise the counter — never lower a live sequence.
  const counterToSet = Math.max(globalMax, counterBefore ?? 0);
  if (options.apply) {
    await orbitDb
      .collection(COUNTERS_COLLECTION)
      .updateOne(
        { _id: ORBIT_IDENTITY_COUNTER_KEY } as never,
        { $set: { seq: counterToSet } } as never,
        { upsert: true },
      );
  }

  return {
    apply: options.apply,
    perModule,
    quarantine,
    registryRows: planned.length,
    counterKey: ORBIT_IDENTITY_COUNTER_KEY,
    counterBefore,
    counterToSet,
    totalToMigrate: planned.length,
  };
}

async function countIdentityCollectionsWithId(orbitDb: mongo.Db, id: number): Promise<number> {
  const present = await Promise.all(
    ORBIT_IDENTITY_COLLECTIONS.map(async (name) => {
      const doc = await orbitDb.collection(name).findOne({ _id: id } as never);
      return doc ? 1 : 0;
    }),
  );
  return present.reduce((sum, value) => sum + value, 0);
}

/**
 * M2 verification gate. Runnable standalone and after apply; reports PASS/FAIL
 * per check and never writes.
 */
export async function verifyOrbitIdentityMigration(
  coreDb: mongo.Db,
  orbitDb: mongo.Db,
): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];

  // 1) per-module identity count == matching appScope count in `user`.
  for (const mapping of ORBIT_SCOPE_MAPPINGS) {
    const identityCount = await orbitDb.collection(mapping.collection).countDocuments({});
    const userCount = await coreDb
      .collection(CORE_USER_COLLECTION)
      .countDocuments({ appScope: mapping.scope });
    checks.push({
      name: `count:${mapping.module}`,
      status: identityCount === userCount ? "PASS" : "FAIL",
      detail: `identities=${identityCount} user(${mapping.scope})=${userCount}`,
    });
  }

  // 2) no `_id` appears in more than one identity collection.
  const seen = new Map<number, string>();
  let duplicate: { id: number; first: string; second: string } | null = null;
  for (const mapping of ORBIT_SCOPE_MAPPINGS) {
    const docs = await orbitDb
      .collection(mapping.collection)
      .find({}, { projection: { _id: 1 } })
      .toArray();
    for (const doc of docs) {
      const id = Number((doc as { _id: unknown })._id);
      const prior = seen.get(id);
      if (prior) {
        duplicate = { id, first: prior, second: mapping.collection };
      } else {
        seen.set(id, mapping.collection);
      }
    }
  }
  checks.push({
    name: "disjoint-ids",
    status: duplicate ? "FAIL" : "PASS",
    detail: duplicate
      ? `id ${duplicate.id} in both ${duplicate.first} and ${duplicate.second}`
      : `${seen.size} unique ids across 4 collections`,
  });

  // 3) the `orbit_identity` counter >= global max `_id`.
  const globalMax = await computeGlobalMaxId(coreDb, orbitDb);
  const counter = await readCounter(orbitDb);
  checks.push({
    name: "counter-high-water",
    status: counter !== null && counter >= globalMax ? "PASS" : "FAIL",
    detail: `counter=${counter ?? "missing"} globalMax=${globalMax}`,
  });

  // 4) FK-resolution spot check: a sample of migrated ids (and FK userIds that
  //    belong to Orbit users) each resolve to exactly one identity row.
  const orbitUsers = await fetchOrbitUsers(coreDb);
  const orbitUserIds = new Set<number>();
  for (const user of orbitUsers) {
    const scope = isString(user.appScope) ? user.appScope : null;
    if (mappingForScope(scope)) {
      orbitUserIds.add(Number(user._id));
    }
  }
  const fkIds = new Set<number>();
  const gatherFk = async (db: mongo.Db, collections: readonly string[]): Promise<void> => {
    for (const name of collections) {
      const docs = await db
        .collection(name)
        .find({}, { projection: { userId: 1 } })
        .toArray();
      for (const doc of docs) {
        const userId = (doc as { userId?: unknown }).userId;
        if (isNumber(userId) && orbitUserIds.has(userId)) {
          fkIds.add(userId);
        }
      }
    }
  };
  await gatherFk(orbitDb, FK_COLLECTIONS_ORBIT);
  await gatherFk(coreDb, FK_COLLECTIONS_CORE);

  const sample = [...new Set<number>([...fkIds, ...[...orbitUserIds].slice(0, 20)])].slice(
    0,
    FK_SAMPLE_LIMIT,
  );
  if (sample.length === 0) {
    checks.push({
      name: "fk-resolution",
      status: "SKIP",
      detail: "no migrated ids / FK references to sample",
    });
  } else {
    const unresolved: number[] = [];
    for (const id of sample) {
      const hits = await countIdentityCollectionsWithId(orbitDb, id);
      if (hits !== 1) {
        unresolved.push(id);
      }
    }
    checks.push({
      name: "fk-resolution",
      status: unresolved.length === 0 ? "PASS" : "FAIL",
      detail:
        unresolved.length === 0
          ? `${sample.length} sampled ids each resolve to exactly one identity`
          : `unresolved/ambiguous ids: ${unresolved.slice(0, 10).join(", ")}`,
    });
  }

  return { checks, ok: checks.every((check) => check.status !== "FAIL") };
}

// ---------------------------------------------------------------------------
// CLI (runs only when invoked directly; importing this module has no side effects)
// ---------------------------------------------------------------------------

function printSummary(summary: OrbitIdentityMigrationSummary): void {
  const mode = summary.apply ? "APPLY (writes performed)" : "DRY-RUN (no writes)";
  console.log(`\n=== Orbit identity backfill — ${mode} ===`);
  console.log("Per-module rows:");
  for (const mapping of ORBIT_SCOPE_MAPPINGS) {
    console.log(`  ${mapping.module.padEnd(10)} → ${summary.perModule[mapping.module] ?? 0}`);
  }
  console.log(`Total to migrate: ${summary.totalToMigrate}`);
  console.log(`Registry rows: ${summary.registryRows}`);
  console.log(
    `Counter "${summary.counterKey}": before=${summary.counterBefore ?? "missing"} ` +
      `${summary.apply ? "set" : "would set"}=${summary.counterToSet}`,
  );
  if (summary.quarantine.length === 0) {
    console.log("Quarantine: none");
  } else {
    console.log(`Quarantine (NOT migrated — unknown orbit:* scope): ${summary.quarantine.length}`);
    for (const row of summary.quarantine) {
      console.log(`  _id=${row.id} appScope=${row.appScope ?? "null"}`);
    }
  }
}

function printVerification(result: VerificationResult): void {
  console.log("\n=== M2 verification gate ===");
  for (const check of result.checks) {
    console.log(`  [${check.status}] ${check.name} — ${check.detail}`);
  }
  console.log(`Gate: ${result.ok ? "PASS" : "FAIL"}`);
}

function resolveTarget(
  label: string,
  uri: string | undefined,
  dbName: string | undefined,
): { uri: string; dbName: string } {
  if (!uri || !dbName) {
    throw new Error(`${label}: connection not configured (uri/database missing in env)`);
  }
  return { uri, dbName };
}

async function main(): Promise<void> {
  dotenvConfig({ path: ".env" });

  const apply = process.argv.includes("--apply") || process.env.APPLY === "1";
  const verifyOnly = process.argv.includes("--verify") && !apply;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && (!process.env.ORBIT_MONGODB_URI || !process.env.ORBIT_MONGO_DATABASE)) {
    throw new Error(
      "Refusing to run in production without explicit ORBIT_MONGODB_URI / ORBIT_MONGO_DATABASE " +
        "(never fall back to the core cluster for Orbit identity writes)",
    );
  }

  const core = resolveTarget("core", process.env.MONGODB_URI, process.env.MONGO_DATABASE);
  const orbit = resolveTarget(
    "orbit",
    process.env.ORBIT_MONGODB_URI ?? process.env.MONGODB_URI,
    process.env.ORBIT_MONGO_DATABASE ?? process.env.MONGO_DATABASE,
  );

  console.log(`core  → ${core.dbName}`);
  console.log(`orbit → ${orbit.dbName}`);

  const coreConn = await mongoose.createConnection(core.uri, { dbName: core.dbName }).asPromise();
  const orbitConn = await mongoose
    .createConnection(orbit.uri, { dbName: orbit.dbName })
    .asPromise();

  try {
    const coreDb = coreConn.db;
    const orbitDb = orbitConn.db;
    if (!coreDb || !orbitDb) {
      throw new Error("Mongo connection has no database handle");
    }

    if (verifyOnly) {
      const result = await verifyOrbitIdentityMigration(coreDb, orbitDb);
      printVerification(result);
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    const summary = await runOrbitIdentityMigration(coreDb, orbitDb, { apply });
    printSummary(summary);

    if (apply) {
      const result = await verifyOrbitIdentityMigration(coreDb, orbitDb);
      printVerification(result);
      process.exitCode = result.ok ? 0 : 1;
    }
  } finally {
    await coreConn.close();
    await orbitConn.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Orbit identity backfill failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
