#!/usr/bin/env node
/**
 * One-shot: merges duplicate child Job Cards that share the same
 * (job_number, jt_dn_number) into a single "winner" JC. Re-parents every
 * dependent FK row from losers to the winner before deleting the losers.
 *
 * Why: Sage exports the same JT across multiple delivery sheets, so
 * uploading a dump against several CPOs of one Sage Job (e.g. P9945)
 * created a new child JC every time. The Phase 1 commit
 * (ed25de689 in main) prevents new duplicates; this script cleans up
 * the historical ones.
 *
 * Winner selection:
 *   1. Highest workflow_status rank (most progressed)
 *   2. Tiebreak: earliest created_at (first-seen)
 *
 * Conflict policy on tables with UNIQUE(job_card_id, ...):
 *   - cpo_calloff_records UNIQUE(company_id, cpo_id, job_card_id, calloff_type)
 *   - job_card_action_completions UNIQUE(job_card_id, step_key, action_type)
 *   - job_card_background_completions UNIQUE(job_card_id, step_key)
 *   When the winner already has a row for the same natural key, the
 *   loser's row is DELETED (winner is the more advanced JC; its work is
 *   authoritative). All other table re-parents are straight UPDATEs.
 *
 * Usage:
 *   node scripts/merge-duplicate-jt-jcs.ts           # dry run
 *   node scripts/merge-duplicate-jt-jcs.ts --apply   # commit
 *   node scripts/merge-duplicate-jt-jcs.ts --apply --job=P9945  # restrict
 *
 * Flags:
 *   --apply        Commit the merges (otherwise dry run)
 *   --job=<num>    Restrict to one Sage Job (e.g. P9945)
 *
 * Reads DATABASE_* env vars from annix-backend/.env.
 *
 * Logs to logs/merge-duplicate-jt-jcs.log (appended).
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import pg from "pg";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.resolve(projectRoot, "annix-backend", ".env");
const logDir = path.resolve(projectRoot, "logs");
const logPath = path.resolve(logDir, "merge-duplicate-jt-jcs.log");

if (!fs.existsSync(envPath)) {
  console.error(`Cannot find ${envPath}`);
  process.exit(1);
}
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const flags = process.argv.slice(2);
const apply = flags.includes("--apply");
const jobFilter = (flags.find((f) => f.startsWith("--job=")) || "").slice("--job=".length) || null;

const WORKFLOW_RANK = {
  draft: 0,
  admin_approval: 10,
  manager_approval: 20,
  manager_final: 30,
  ready: 40,
  dispatched: 50,
  file_closed: 60,
};

function rankOf(status) {
  if (status == null) return -1;
  return Object.hasOwn(WORKFLOW_RANK, status) ? WORKFLOW_RANK[status] : 5;
}

function logLine(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(line);
  fs.appendFileSync(logPath, `${stamped}\n`);
}

const FK_TABLES_PLAIN = [
  "job_card_line_items",
  "job_card_attachments",
  "job_card_documents",
  "job_card_data_books",
  "job_card_versions",
  "job_card_extraction_corrections",
  "job_card_job_files",
  "job_card_approvals",
  "dispatch_cdns",
  "dispatch_load_photos",
  "dispatch_scans",
  "inspection_bookings",
  "qa_review_decisions",
  "requisitions",
  "stock_returns",
  "supplier_certificates",
  "workflow_notifications",
  "stock_allocations",
  "stock_issuances",
  "issuance_batch_records",
];

const FK_TABLES_WITH_CONFLICT = [
  {
    table: "cpo_calloff_records",
    naturalKey: ["company_id", "cpo_id", "calloff_type"],
  },
  {
    table: "job_card_action_completions",
    naturalKey: ["step_key", "action_type"],
  },
  {
    table: "job_card_background_completions",
    naturalKey: ["step_key"],
  },
  {
    table: "job_card_coating_analyses",
    naturalKey: ["company_id"],
  },
  {
    table: "qc_defelsko_batches",
    naturalKey: ["field_key"],
  },
];

const FK_SELF_REFS = [{ table: "job_cards", column: "superseded_by_id" }];

const FK_OTHER = [{ table: "stock_items", column: "source_job_card_id" }];

async function findDuplicateGroups(client) {
  const params = jobFilter ? [jobFilter] : [];
  const filterClause = jobFilter ? "AND jc.job_number = $1" : "";
  const sql = `
    WITH groups AS (
      SELECT job_number, jt_dn_number
      FROM job_cards
      WHERE parent_job_card_id IS NOT NULL
        AND jt_dn_number IS NOT NULL
      GROUP BY job_number, jt_dn_number
      HAVING COUNT(*) > 1
    )
    SELECT
      jc.id,
      jc.job_number,
      jc.jt_dn_number,
      jc.jc_number,
      jc.workflow_status,
      jc.status,
      jc.parent_job_card_id,
      jc.cpo_id,
      jc.created_at
    FROM job_cards jc
    JOIN groups g USING (job_number, jt_dn_number)
    WHERE jc.parent_job_card_id IS NOT NULL ${filterClause}
    ORDER BY jc.job_number, jc.jt_dn_number, jc.created_at
  `;
  const { rows } = await client.query(sql, params);
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.job_number}|${row.jt_dn_number}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return Array.from(grouped.entries()).map(([key, jcs]) => {
    const [jobNumber, jtNumber] = key.split("|");
    return { jobNumber, jtNumber, jcs };
  });
}

function pickWinner(jcs) {
  return [...jcs].sort((a, b) => {
    const rankDiff = rankOf(b.workflow_status) - rankOf(a.workflow_status);
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];
}

async function rowCount(client, table, column, ids) {
  if (ids.length === 0) return 0;
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${column} = ANY($1::int[])`,
    [ids],
  );
  return rows[0].n;
}

async function summarisePlanForGroup(client, group) {
  const winner = pickWinner(group.jcs);
  const losers = group.jcs.filter((jc) => jc.id !== winner.id);
  const loserIds = losers.map((l) => l.id);

  const plainCounts = {};
  for (const t of FK_TABLES_PLAIN) {
    plainCounts[t] = await rowCount(client, t, "job_card_id", loserIds);
  }

  const conflictPlans = {};
  for (const def of FK_TABLES_WITH_CONFLICT) {
    const naturalKeyCols = def.naturalKey.map((c) => `lhs.${c}`).join(", ");
    const winnerKeyCols = def.naturalKey.map((c) => `rhs.${c}`).join(", ");
    const onClause = def.naturalKey
      .map((c) => `lhs.${c} IS NOT DISTINCT FROM rhs.${c}`)
      .join(" AND ");
    const totalRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM ${def.table} WHERE job_card_id = ANY($1::int[])`,
      [loserIds],
    );
    const total = totalRes.rows[0].n;
    if (total === 0) {
      conflictPlans[def.table] = { total: 0, conflicts: 0, willMove: 0, willDelete: 0 };
      continue;
    }
    const conflictRes = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM ${def.table} lhs
       WHERE lhs.job_card_id = ANY($1::int[])
         AND EXISTS (
           SELECT 1 FROM ${def.table} rhs
           WHERE rhs.job_card_id = $2
             AND ${onClause}
         )`,
      [loserIds, winner.id],
    );
    const conflicts = conflictRes.rows[0].n;
    conflictPlans[def.table] = {
      total,
      conflicts,
      willMove: total - conflicts,
      willDelete: conflicts,
    };
  }

  const selfCounts = {};
  for (const def of FK_SELF_REFS) {
    selfCounts[`${def.table}.${def.column}`] = await rowCount(
      client,
      def.table,
      def.column,
      loserIds,
    );
  }

  const otherCounts = {};
  for (const def of FK_OTHER) {
    otherCounts[`${def.table}.${def.column}`] = await rowCount(
      client,
      def.table,
      def.column,
      loserIds,
    );
  }

  return { winner, losers, plainCounts, conflictPlans, selfCounts, otherCounts };
}

async function applyMergeForGroup(client, group, plan) {
  const winnerId = plan.winner.id;
  const loserIds = plan.losers.map((l) => l.id);

  await client.query("SAVEPOINT group_merge");
  try {
    for (const t of FK_TABLES_PLAIN) {
      await client.query(`UPDATE ${t} SET job_card_id = $1 WHERE job_card_id = ANY($2::int[])`, [
        winnerId,
        loserIds,
      ]);
    }

    for (const def of FK_TABLES_WITH_CONFLICT) {
      const partitionCols = def.naturalKey.join(", ");
      await client.query(
        `WITH involved AS (
           SELECT id, job_card_id
           FROM ${def.table}
           WHERE job_card_id = $1 OR job_card_id = ANY($2::int[])
         ),
         ranked AS (
           SELECT t.id, ROW_NUMBER() OVER (
             PARTITION BY ${partitionCols}
             ORDER BY (t.job_card_id = $1) DESC, t.id DESC
           ) AS rn
           FROM ${def.table} t
           WHERE t.id IN (SELECT id FROM involved)
         )
         DELETE FROM ${def.table}
         WHERE id IN (SELECT id FROM ranked WHERE rn > 1)`,
        [winnerId, loserIds],
      );
      await client.query(
        `UPDATE ${def.table} SET job_card_id = $1 WHERE job_card_id = ANY($2::int[])`,
        [winnerId, loserIds],
      );
    }

    for (const def of FK_SELF_REFS) {
      await client.query(
        `UPDATE ${def.table} SET ${def.column} = $1
         WHERE ${def.column} = ANY($2::int[]) AND id <> ALL($2::int[])`,
        [winnerId, loserIds],
      );
    }

    for (const def of FK_OTHER) {
      await client.query(
        `UPDATE ${def.table} SET ${def.column} = $1 WHERE ${def.column} = ANY($2::int[])`,
        [winnerId, loserIds],
      );
    }

    await client.query("DELETE FROM job_cards WHERE id = ANY($1::int[])", [loserIds]);

    await client.query("RELEASE SAVEPOINT group_merge");
  } catch (err) {
    await client.query("ROLLBACK TO SAVEPOINT group_merge");
    throw err;
  }
}

function formatPlan(group, plan) {
  const lines = [];
  lines.push(`\n=== ${group.jobNumber} / ${group.jtNumber} (${group.jcs.length} JCs) ===`);
  lines.push(
    `  Winner: JC#${plan.winner.id} (${plan.winner.jc_number}, ${plan.winner.workflow_status}, page ${plan.winner.created_at instanceof Date ? plan.winner.created_at.toISOString().slice(0, 10) : plan.winner.created_at})`,
  );
  for (const l of plan.losers) {
    lines.push(`  Loser : JC#${l.id} (${l.jc_number}, ${l.workflow_status}) -> merge into winner`);
  }
  const plainSummary = Object.entries(plan.plainCounts)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${t}=${n}`)
    .join(", ");
  if (plainSummary) lines.push(`    re-parent (no conflicts): ${plainSummary}`);

  for (const [t, p] of Object.entries(plan.conflictPlans)) {
    if (p.total === 0) continue;
    lines.push(
      `    re-parent ${t}: ${p.willMove} move, ${p.willDelete} delete (winner already has)`,
    );
  }

  const selfMoves = Object.entries(plan.selfCounts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`)
    .join(", ");
  if (selfMoves) lines.push(`    re-link self-ref: ${selfMoves}`);

  const otherMoves = Object.entries(plan.otherCounts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`)
    .join(", ");
  if (otherMoves) lines.push(`    re-link other: ${otherMoves}`);

  return lines.join("\n");
}

async function main() {
  logLine(
    `merge-duplicate-jt-jcs.ts starting (mode=${apply ? "APPLY" : "DRY-RUN"}${jobFilter ? ` job=${jobFilter}` : ""})`,
  );

  const client = new pg.Client({
    host: env.DATABASE_HOST,
    port: parseInt(env.DATABASE_PORT || "5432", 10),
    user: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    const groups = await findDuplicateGroups(client);
    logLine(`Found ${groups.length} duplicate JT group(s)`);
    if (groups.length === 0) {
      logLine("Nothing to do.");
      return;
    }

    if (apply) {
      await client.query("BEGIN");
    }

    let totalLosers = 0;
    let totalConflictDeletes = 0;
    let totalReparents = 0;

    for (const group of groups) {
      const plan = await summarisePlanForGroup(client, group);
      const text = formatPlan(group, plan);
      logLine(text);
      totalLosers += plan.losers.length;
      for (const p of Object.values(plan.conflictPlans)) {
        totalConflictDeletes += p.willDelete;
        totalReparents += p.willMove;
      }
      for (const n of Object.values(plan.plainCounts)) totalReparents += n;
      for (const n of Object.values(plan.selfCounts)) totalReparents += n;
      for (const n of Object.values(plan.otherCounts)) totalReparents += n;

      if (apply) {
        await applyMergeForGroup(client, group, plan);
        logLine("  ✓ applied");
      }
    }

    logLine(
      `\nTotal: ${groups.length} group(s), ${totalLosers} loser JC(s) to delete, ${totalReparents} row(s) re-parented, ${totalConflictDeletes} conflict row(s) deleted`,
    );

    if (apply) {
      await client.query("COMMIT");
      logLine("COMMITTED");

      const verify = await client.query(`
        SELECT COUNT(*)::int AS n
        FROM (
          SELECT job_number, jt_dn_number
          FROM job_cards
          WHERE parent_job_card_id IS NOT NULL AND jt_dn_number IS NOT NULL
          GROUP BY job_number, jt_dn_number
          HAVING COUNT(*) > 1
        ) g
      `);
      logLine(`Verification: ${verify.rows[0].n} duplicate group(s) remain`);
    } else {
      logLine("\nDRY-RUN — no changes committed. Re-run with --apply to commit.");
    }
  } catch (err) {
    if (apply) await client.query("ROLLBACK").catch(() => {});
    logLine(`ERROR: ${err instanceof Error ? err.stack || err.message : String(err)}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
