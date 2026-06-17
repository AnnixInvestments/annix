// Read-only job-matching explainer. Scores a seeker's CV against the live job
// pool and prints the full per-component breakdown for the top matches — nothing
// is written. Use it to inspect and rate the matching rules on real data.
//
//   pnpm match:explain <candidate-id | email> [limit] [profile|compare]
//
// profile ∈ default | skills-forward | balanced   (weight A/B, see WEIGHT_PROFILES)
// "compare" runs default vs skills-forward side by side so you can see how the
// ranking shifts.
//
// Examples:
//   pnpm match:explain 1234
//   pnpm match:explain seeker@example.com 20
//   pnpm match:explain seeker@example.com 20 skills-forward
//   pnpm match:explain seeker@example.com 20 compare

// MUST be the first import: loads .env (DATABASE_DRIVER etc.) before AppModule's
// module tree evaluates, so the driver-gated providers wire up correctly.
import "../src/load-env";
import { setDefaultResultOrder, setServers } from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";
import { NestFactory } from "@nestjs/core";
import type { Candidate } from "../src/annix-orbit/entities/candidate.entity";
import { CandidateRepository } from "../src/annix-orbit/repositories/candidate.repository";
import {
  CandidateJobMatchingService,
  DEFAULT_WEIGHTS,
  weightProfile,
} from "../src/annix-orbit/services/candidate-job-matching.service";
import { AppModule } from "../src/app.module";

// Mirror main.ts so the local mongodb+srv lookup works (some resolvers/VPNs
// break Node's SRV queries — MONGO_DNS_SERVERS points at public resolvers).
setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);
const mongoDnsServers = process.env.MONGO_DNS_SERVERS;
if (mongoDnsServers) {
  setServers(
    mongoDnsServers
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean),
  );
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function num(value: number): string {
  return value.toFixed(2);
}

async function resolveCandidateId(
  candidateRepo: CandidateRepository,
  identifier: string,
): Promise<number | null> {
  if (/^\d+$/.test(identifier)) {
    const byId = await candidateRepo.findById(Number(identifier));
    return byId ? byId.id : null;
  }
  const byEmail = await candidateRepo.findByEmail(identifier);
  if (byEmail.length === 0) {
    return null;
  }
  // Prefer a candidate that actually has an embedding (a processed CV).
  const withEmbedding = byEmail.find((candidate) => candidate.embedding !== null);
  const chosen = withEmbedding ? withEmbedding : byEmail[0];
  return chosen.id;
}

function printCandidateHeader(candidate: Candidate): void {
  const extracted = candidate.extractedData;
  const shared = candidate.workProfile?.shared;
  const skills = extracted?.skills ?? [];
  console.log("=".repeat(80));
  console.log(`Candidate #${candidate.id}  (${candidate.email ?? "no email"})`);
  console.log(`  CV embedding:   ${candidate.embedding ? "yes" : "NO (cold-start)"}`);
  console.log(`  experience:     ${extracted?.experienceYears ?? "unknown"} yrs`);
  console.log(`  seniority:      ${extracted?.seniority ?? "unknown"}`);
  console.log(`  skills (${skills.length}):     ${skills.slice(0, 12).join(", ")}`);
  console.log(`  target cats:    ${(candidate.targetCategories ?? []).join(", ") || "none"}`);
  console.log(`  work fields:    ${(shared?.fields ?? []).join(", ") || "none"}`);
  console.log(`  primary role:   ${shared?.primaryRole ?? "none"}`);
  console.log(`  salary floor:   ${shared?.expectedSalaryMin ?? "none"}`);
  console.log(`  travel km:      ${shared?.willingToTravelKm ?? "none"}`);
  console.log(`  match tier:     ${candidate.matchTier}`);
  console.log("=".repeat(80));
}

type ExplainRow = Awaited<
  ReturnType<CandidateJobMatchingService["explainCandidateMatches"]>
>[number];

function printBreakdown(results: ExplainRow[]): void {
  results.forEach((result, index) => {
    const details = result.matchDetails;
    const skillsMatched = details.skillsMatched ?? [];
    const skillsMissing = details.skillsMissing ?? [];
    const matched = skillsMatched.length;
    const total = matched + skillsMissing.length;
    const skillsOverlap = details.skillsOverlap ?? 0;
    const experienceMatch = details.experienceMatch ?? 0;
    const locationMatch = details.locationMatch ?? 0;
    const salaryMatch = details.salaryMatch ?? 0;
    const dismissPenalty = details.dismissPenalty ?? 0;
    const distance =
      details.distanceKm === null || details.distanceKm === undefined
        ? "no coords"
        : `${details.distanceKm}km`;
    console.log("");
    console.log(
      `#${String(index + 1).padStart(2)}  overall=${pct(result.overallScore)}  emb=${pct(
        result.similarityScore,
      )}  | ${result.job.title ?? "(untitled)"} — ${result.job.company ?? "?"}`,
    );
    console.log(
      `      skills  ${num(skillsOverlap)}  (${matched}/${total})` +
        (matched > 0 ? `  matched: ${skillsMatched.slice(0, 6).join(", ")}` : "") +
        (skillsMissing.length > 0 ? `  | missing: ${skillsMissing.slice(0, 6).join(", ")}` : ""),
    );
    console.log(
      `      exp ${num(experienceMatch)}   loc ${num(locationMatch)} (${distance})   salary ${num(
        salaryMatch,
      )}` +
        (dismissPenalty > 0 ? `   dismiss -${num(dismissPenalty)}` : "") +
        (details.outsideTradeRadius ? "   [outside travel radius]" : ""),
    );
    console.log(`      ${details.reasoning}`);
  });
}

function printComparison(byDefault: ExplainRow[], bySkills: ExplainRow[]): void {
  const sortedDefault = [...byDefault].sort((a, b) => b.overallScore - a.overallScore);
  const sortedSkills = [...bySkills].sort((a, b) => b.overallScore - a.overallScore);
  const skillsScoreById = new Map(bySkills.map((row) => [row.job.id, row.overallScore]));
  const skillsRankById = new Map(sortedSkills.map((row, index) => [row.job.id, index + 1]));
  console.log("");
  console.log("default-rank  shift  overall (default → skills-forward)  | job");
  sortedDefault.forEach((row, index) => {
    const defaultRank = index + 1;
    const skillsRank = skillsRankById.get(row.job.id) ?? defaultRank;
    const delta = defaultRank - skillsRank; // positive = climbs under skills-forward
    const shift = delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : "—";
    const skillsScore = skillsScoreById.get(row.job.id) ?? row.overallScore;
    console.log(
      `  #${String(defaultRank).padStart(2)}   ${shift.padEnd(4)}  ${pct(row.overallScore)} → ${pct(
        skillsScore,
      )}   | ${row.job.title ?? "(untitled)"}`,
    );
  });
}

async function main() {
  const identifier = process.argv[2];
  const limitArg = process.argv[3];
  const profileArg = process.argv[4];
  if (!identifier) {
    console.error("Usage: pnpm ts-node scripts/match-explain.ts <candidate-id | email> [limit]");
    process.exitCode = 1;
    return;
  }
  const limit = limitArg && /^\d+$/.test(limitArg) ? Number(limitArg) : 15;

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const candidateRepo = app.get(CandidateRepository);
    const matchingService = app.get(CandidateJobMatchingService);

    const candidateId = await resolveCandidateId(candidateRepo, identifier);
    if (candidateId === null) {
      console.error(`No candidate found for "${identifier}" in this Orbit cluster.`);
      const [available] = await candidateRepo.listNonFixture({ search: null, skip: 0, limit: 60 });
      const withCv = available.filter((candidate) => candidate.embedding !== null);
      if (withCv.length > 0) {
        console.error("\nSeekers with a CV in this cluster (id — email), try one of these:");
        for (const candidate of withCv.slice(0, 20)) {
          console.error(`  ${candidate.id} — ${candidate.email ?? "(no email)"}`);
        }
      } else {
        console.error("\nNo seekers with a processed CV exist in this Orbit cluster.");
      }
      process.exitCode = 1;
      return;
    }

    const candidate = await candidateRepo.findById(candidateId);
    if (candidate) {
      printCandidateHeader(candidate);
    }

    if (profileArg === "compare") {
      const byDefault = await matchingService.explainCandidateMatches(
        candidateId,
        limit,
        DEFAULT_WEIGHTS,
      );
      if (byDefault.length === 0) {
        console.log("No matches (no CV embedding yet, or no jobs in the target pool).");
        return;
      }
      const bySkills = await matchingService.explainCandidateMatches(
        candidateId,
        limit,
        weightProfile("skills-forward"),
      );
      console.log("");
      console.log(
        `A/B — default (embedding ${DEFAULT_WEIGHTS.embedding}) vs skills-forward — ranking shift:`,
      );
      printComparison(byDefault, bySkills);
      console.log("");
      console.log("(read-only, nothing persisted)");
      return;
    }

    const profileName = profileArg ? profileArg : "default";
    const weights = weightProfile(profileName);
    const results = await matchingService.explainCandidateMatches(candidateId, limit, weights);
    if (results.length === 0) {
      console.log("No matches (no CV embedding yet, or no jobs in the target pool).");
      return;
    }
    console.log("");
    console.log(`Profile: ${profileName} (embedding weight ${weights.embedding})`);
    printBreakdown(results);
    console.log("");
    console.log(`Scored ${results.length} top matches (read-only, nothing persisted).`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
