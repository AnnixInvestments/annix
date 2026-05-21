#!/usr/bin/env node
/**
 * Annix Orbit match-score bias audit.
 *
 * Methodology: docs/cv-assistant-bias-audit-methodology.md
 *
 * Reads candidate-job match scores grouped by EE population group,
 * residualises against experienceYears + skillsOverlap, runs a two-sample
 * KS-test for every pair of groups, and writes a markdown report.
 *
 * Does NOT auto-run on release. Run manually under DPO supervision.
 */

import { writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";
import pg from "pg";

const SMALL_SAMPLE_CUTOFF = 30;
const KS_EFFECT_SIZE_ALARM = 0.1;
const ALPHA = 0.05;

async function main() {
  const args = parseArgs(argv.slice(2));
  if (!args.output) {
    console.error("Usage: bias-audit.mjs --output <report.md>");
    exit(2);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required (use the annix_cv_ai read-only role).");
    exit(2);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const rows = await fetchScores(client);
    if (rows.length === 0) {
      console.error("No rows returned — check EE compliance flag + role permissions.");
      exit(1);
    }

    const grouped = groupByPopulation(rows);
    const groupKeys = [...grouped.keys()].sort();

    const residuals = residualise(rows);
    const residualGrouped = groupResiduals(residuals);

    const pairs = pairCombinations(groupKeys);
    const results = pairs
      .map((pair) => testPair(pair, residualGrouped, grouped))
      .filter((r) => r !== null);

    const report = renderReport({
      totalCandidates: rows.length,
      groupCounts: countByGroup(grouped),
      results,
    });

    await writeFile(args.output, report, "utf8");
    console.log(`Wrote ${args.output}`);
  } finally {
    await client.end();
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--output") {
      out.output = argv[i + 1];
      i++;
    }
  }
  return out;
}

async function fetchScores(client) {
  const sql = `
    SELECT
      m.id::int                                          AS match_id,
      m.candidate_id::int                                AS candidate_id,
      m.overall_score::float                             AS overall_score,
      COALESCE(c.extracted_data->>'experienceYears', '0')::float AS experience_years,
      COALESCE((m.match_details->>'skillsOverlap')::float, 0)    AS skills_overlap,
      e.population_group                                 AS population_group
    FROM cv_assistant_candidate_job_matches m
      JOIN cv_assistant_candidates c ON c.id = m.candidate_id
      JOIN cv_assistant_candidate_ee_attributes e ON e.candidate_id = c.id
    WHERE m.overall_score IS NOT NULL
      AND e.population_group IS NOT NULL
  `;
  const res = await client.query(sql);
  return res.rows.map((r) => ({
    matchId: r.match_id,
    candidateId: r.candidate_id,
    overallScore: Number(r.overall_score),
    experienceYears: Number(r.experience_years) || 0,
    skillsOverlap: Number(r.skills_overlap) || 0,
    populationGroup: r.population_group,
  }));
}

function groupByPopulation(rows) {
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.populationGroup);
    if (list) {
      list.push(row);
    } else {
      map.set(row.populationGroup, [row]);
    }
  }
  return map;
}

function countByGroup(grouped) {
  return [...grouped.entries()].map(([group, rows]) => ({ group, count: rows.length }));
}

function residualise(rows) {
  const meanExp = mean(rows.map((r) => r.experienceYears));
  const meanOverlap = mean(rows.map((r) => r.skillsOverlap));
  const meanScore = mean(rows.map((r) => r.overallScore));

  const xExp = rows.map((r) => r.experienceYears - meanExp);
  const xOverlap = rows.map((r) => r.skillsOverlap - meanOverlap);
  const y = rows.map((r) => r.overallScore - meanScore);

  const denomExp = sum(xExp.map((v) => v * v)) || 1;
  const denomOverlap = sum(xOverlap.map((v) => v * v)) || 1;
  const bExp = sum(xExp.map((v, i) => v * y[i])) / denomExp;
  const bOverlap = sum(xOverlap.map((v, i) => v * y[i])) / denomOverlap;

  return rows.map((r, i) => ({
    ...r,
    residual: r.overallScore - meanScore - bExp * xExp[i] - bOverlap * xOverlap[i],
  }));
}

function groupResiduals(residuals) {
  const map = new Map();
  for (const r of residuals) {
    const list = map.get(r.populationGroup);
    if (list) {
      list.push(r.residual);
    } else {
      map.set(r.populationGroup, [r.residual]);
    }
  }
  return map;
}

function pairCombinations(keys) {
  const out = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      out.push([keys[i], keys[j]]);
    }
  }
  return out;
}

function testPair([a, b], residualGrouped, raw) {
  const samplesA = residualGrouped.get(a) ?? [];
  const samplesB = residualGrouped.get(b) ?? [];

  if (samplesA.length < SMALL_SAMPLE_CUTOFF || samplesB.length < SMALL_SAMPLE_CUTOFF) {
    return {
      pair: `${a} vs ${b}`,
      nA: samplesA.length,
      nB: samplesB.length,
      ks: null,
      pValue: null,
      note: `Skipped — sample below ${SMALL_SAMPLE_CUTOFF}`,
    };
  }

  const ks = ksStatistic(samplesA, samplesB);
  const pValue = ksApproxP(ks, samplesA.length, samplesB.length);

  return {
    pair: `${a} vs ${b}`,
    nA: samplesA.length,
    nB: samplesB.length,
    ks,
    pValue,
    note: null,
  };
}

function ksStatistic(a, b) {
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  const all = [...sortedA, ...sortedB].sort((x, y) => x - y);

  let maxDiff = 0;
  for (const v of all) {
    const cdfA = cdf(sortedA, v);
    const cdfB = cdf(sortedB, v);
    const diff = Math.abs(cdfA - cdfB);
    if (diff > maxDiff) maxDiff = diff;
  }
  return maxDiff;
}

function cdf(sortedSample, x) {
  let lo = 0;
  let hi = sortedSample.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedSample[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo / sortedSample.length;
}

function ksApproxP(d, n, m) {
  // Two-sample KS, asymptotic p-value.
  const en = Math.sqrt((n * m) / (n + m));
  const lambda = (en + 0.12 + 0.11 / en) * d;
  let sum = 0;
  for (let j = 1; j <= 100; j++) {
    const term = 2 * (-1) ** (j - 1) * Math.exp(-2 * lambda * lambda * j * j);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.min(1, Math.max(0, sum));
}

function mean(arr) {
  return arr.length === 0 ? 0 : sum(arr) / arr.length;
}

function sum(arr) {
  let s = 0;
  for (const v of arr) s += v;
  return s;
}

function renderReport({ totalCandidates, groupCounts, results }) {
  const lines = [];
  lines.push("# Annix Orbit Match-Score Bias Audit Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total matches analysed: ${totalCandidates}`);
  lines.push("");
  lines.push("## Per-group counts");
  lines.push("");
  for (const { group, count } of groupCounts) {
    lines.push(`- **${group}**: ${count} match rows`);
  }
  lines.push("");
  lines.push("## Pair-wise residualised score distribution tests");
  lines.push("");
  lines.push("Method: residualised `overallScore` against `experienceYears` and");
  lines.push("`skillsOverlap`, then ran a two-sample KS test for every");
  lines.push("population-group pair with n ≥ 30 each.");
  lines.push("");
  lines.push(
    `Bonferroni-corrected α: ${(ALPHA / Math.max(1, results.filter((r) => r.ks !== null).length)).toFixed(4)}`,
  );
  lines.push(`Effect-size alarm: D ≥ ${KS_EFFECT_SIZE_ALARM}`);
  lines.push("");
  lines.push("| Pair | n_A | n_B | KS D | p-value | Result |");
  lines.push("| --- | ---: | ---: | ---: | ---: | --- |");
  const corrected = ALPHA / Math.max(1, results.filter((r) => r.ks !== null).length);
  for (const r of results) {
    if (r.ks === null) {
      lines.push(`| ${r.pair} | ${r.nA} | ${r.nB} | — | — | ${r.note} |`);
    } else {
      const flagged = r.ks >= KS_EFFECT_SIZE_ALARM || r.pValue < corrected;
      const result = flagged ? "⚠ flagged" : "pass";
      lines.push(
        `| ${r.pair} | ${r.nA} | ${r.nB} | ${r.ks.toFixed(4)} | ${r.pValue.toFixed(4)} | ${result} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- Population group is the only attribute reported aggregately; no");
  lines.push("  individual candidate or score is surfaced.");
  lines.push("- Location is intentionally not controlled — see methodology doc.");
  lines.push("- Re-validate the methodology with a statistician before acting on a flag.");
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
