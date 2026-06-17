// Backfill extractedSkills for existing external jobs that have none, using the
// same Gemini job-analysis pass that ingestion now runs. WRITES to the DB and
// makes one Gemini call per job, so it is cost-capped — run it again to continue.
//
//   pnpm backfill:job-skills [max-jobs] [--dry-run]
//
// Examples:
//   pnpm backfill:job-skills 100            # analyse + persist up to 100 jobs
//   pnpm backfill:job-skills 50 --dry-run   # show what would happen, write nothing

import "../src/load-env";
import { setDefaultResultOrder, setServers } from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";
import { NestFactory } from "@nestjs/core";
import { ExternalJobRepository } from "../src/annix-orbit/repositories/external-job.repository";
import { JobCategorizationService } from "../src/annix-orbit/services/job-categorization.service";
import { AppModule } from "../src/app.module";

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

const DEFAULT_MAX = 100;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const maxArg = args.find((arg) => /^\d+$/.test(arg));
  const max = maxArg ? Number(maxArg) : DEFAULT_MAX;

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  try {
    const jobRepo = app.get(ExternalJobRepository);
    const categorization = app.get(JobCategorizationService);

    const jobs = await jobRepo.jobsMissingSkills(max);
    console.log(
      `Found ${jobs.length} job(s) without skills (cap ${max})${dryRun ? " — DRY RUN" : ""}.`,
    );

    let withSkills = 0;
    let withoutSkills = 0;
    for (const [index, job] of jobs.entries()) {
      const analysis = await categorization.analyzeJob({
        title: job.title,
        providerCategory: job.category,
        description: job.description,
      });
      const skills = analysis.skills;
      if (skills.length > 0) {
        withSkills += 1;
      } else {
        withoutSkills += 1;
      }
      // Persist for every analysed job — stamps skillsAnalyzedAt so empty-shell
      // jobs leave the queue instead of being re-analysed on the next run.
      if (!dryRun) {
        await jobRepo.updateExtractedSkills(job.id, skills);
      }
      console.log(
        `  [${index + 1}/${jobs.length}] #${job.id} ${job.title ?? "(untitled)"} → ${
          skills.length > 0 ? skills.slice(0, 8).join(", ") : "(no skills found)"
        }`,
      );
    }

    console.log("");
    console.log(
      `Done. ${withSkills} job(s) got skills${dryRun ? " (not written)" : " (written)"}, ` +
        `${withoutSkills} returned none. Run again to continue if more remain.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
