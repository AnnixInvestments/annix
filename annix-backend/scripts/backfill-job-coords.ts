// Backfill coordinates for existing external jobs that have none. The free static
// SA gazetteer (coordsForLocation) resolves most jobs with no API call; only the
// misses fall through to the paid Google geocoder (a no-op until GOOGLE_GEOCODE_API_KEY
// is set). WRITES to the DB and stamps every attempt, so re-running only revisits
// the still-unresolved tail.
//
//   pnpm backfill:job-coords [max-jobs] [--dry-run]

import "../src/load-env";
import { setDefaultResultOrder, setServers } from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";
import { NestFactory } from "@nestjs/core";
import { coordsForLocation } from "../src/annix-orbit/lib/sa-locations";
import { ExternalJobRepository } from "../src/annix-orbit/repositories/external-job.repository";
import { GeocodeService } from "../src/annix-orbit/services/geocode.service";
import { AppModule } from "../src/app.module";

setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);
const mongoDnsServers = process.env.MONGO_DNS_SERVERS;
if (mongoDnsServers) {
  setServers(
    mongoDnsServers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

// Opt-in redirect to a non-default cluster (e.g. test) without editing .env, so a
// backfill never has to point local .env at prod. Applied after load-env has run,
// before the Nest context reads the connection env. Override the main cluster too
// so booting the app context doesn't open a prod connection.
if (process.env.ORBIT_URI_OVERRIDE) {
  process.env.ORBIT_MONGODB_URI = process.env.ORBIT_URI_OVERRIDE;
  if (process.env.ORBIT_DB_OVERRIDE) {
    process.env.ORBIT_MONGO_DATABASE = process.env.ORBIT_DB_OVERRIDE;
  }
}
if (process.env.MAIN_URI_OVERRIDE) {
  process.env.MONGODB_URI = process.env.MAIN_URI_OVERRIDE;
  if (process.env.MAIN_DB_OVERRIDE) {
    process.env.MONGO_DATABASE = process.env.MAIN_DB_OVERRIDE;
  }
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
    const geocode = app.get(GeocodeService);

    const jobs = await jobRepo.jobsMissingCoords(max);
    console.log(
      `Found ${jobs.length} job(s) without coords (cap ${max})${dryRun ? " — DRY RUN" : ""}.`,
    );

    let located = 0;
    let noResult = 0;
    for (const [index, job] of jobs.entries()) {
      const address = job.locationRaw ?? job.locationArea;
      const coords = address
        ? (coordsForLocation(address) ?? (await geocode.geocode(address)))
        : null;
      if (coords) {
        located += 1;
      } else {
        noResult += 1;
      }
      if (!dryRun) {
        await jobRepo.markJobGeocoded(job.id, coords?.lat ?? null, coords?.lon ?? null);
      }
      console.log(
        `  [${index + 1}/${jobs.length}] #${job.id} ${address ?? "(no address)"} → ${
          coords ? `${coords.lat}, ${coords.lon}` : "(no result)"
        }`,
      );
    }

    console.log("");
    console.log(
      `Done. ${located} located${dryRun ? " (not written)" : " (written)"}, ${noResult} no result. ` +
        "Run again to continue if more remain.",
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
