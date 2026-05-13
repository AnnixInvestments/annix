#!/usr/bin/env node
/**
 * Backfill location_lat / location_lon for every cv_assistant_candidate
 * and cv_assistant_external_job that has location text but no coords.
 *
 * Uses the cv_assistant_geocode_cache table to dedupe addresses across
 * rows (same "Sandton" / "Kathu, Northern Cape" / etc. only geocoded
 * once), then falls back to the Google Maps Geocoding API.
 *
 * Requires:
 *   DATABASE_URL          — read-write Postgres connection
 *   GOOGLE_GEOCODE_API_KEY (or GOOGLE_PLACES_API_KEY / GOOGLE_MAPS_API_KEY)
 *
 * Throttles to 1 request per 250ms to stay inside Google's free tier
 * (40k requests/month) even on a backfill burst.
 */

import { writeSync } from "node:fs";
import { argv, exit, stderr } from "node:process";
import pg from "pg";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PER_REQUEST_DELAY_MS = 250;
const COORD_PRECISION = 2;

async function main() {
  const args = parseArgs(argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey =
    process.env.GOOGLE_GEOCODE_API_KEY ??
    process.env.GOOGLE_PLACES_API_KEY ??
    process.env.GOOGLE_MAPS_API_KEY ??
    null;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    exit(2);
  }
  if (!apiKey) {
    console.error(
      "GOOGLE_GEOCODE_API_KEY (or GOOGLE_PLACES_API_KEY / GOOGLE_MAPS_API_KEY) is required.",
    );
    exit(2);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    if (!args.skipCandidates) {
      await backfillCandidates(client, apiKey);
    }
    if (!args.skipJobs) {
      await backfillJobs(client, apiKey);
    }
  } finally {
    await client.end();
  }
}

function parseArgs(argv) {
  const out = { skipCandidates: false, skipJobs: false };
  for (const arg of argv) {
    if (arg === "--skip-candidates") out.skipCandidates = true;
    if (arg === "--skip-jobs") out.skipJobs = true;
  }
  return out;
}

async function backfillCandidates(client, apiKey) {
  const candidates = await client.query(`
    SELECT id, COALESCE(
      extracted_data->>'location',
      NULLIF(TRIM(BOTH FROM regexp_replace(COALESCE(extracted_data->>'summary', ''), '\\s+', ' ', 'g')), '')
    ) AS address
    FROM cv_assistant_candidates
    WHERE location_lat IS NULL AND location_lon IS NULL
    ORDER BY id
  `);
  log(`Candidates without coords: ${candidates.rows.length}`);

  for (const row of candidates.rows) {
    const address = row.address;
    if (!address || String(address).trim().length === 0) continue;
    const coords = await geocode(client, apiKey, address);
    if (!coords) continue;
    await client.query(
      "UPDATE cv_assistant_candidates SET location_lat=$1, location_lon=$2 WHERE id=$3",
      [coords.lat, coords.lon, row.id],
    );
    log(`Candidate ${row.id}: ${address} → (${coords.lat}, ${coords.lon})`);
    await sleep(PER_REQUEST_DELAY_MS);
  }
}

async function backfillJobs(client, apiKey) {
  const jobs = await client.query(`
    SELECT id, COALESCE(location_raw, location_area) AS address
    FROM cv_assistant_external_jobs
    WHERE location_lat IS NULL AND location_lon IS NULL
      AND (location_raw IS NOT NULL OR location_area IS NOT NULL)
    ORDER BY id
  `);
  log(`Jobs without coords: ${jobs.rows.length}`);

  let processed = 0;
  for (const row of jobs.rows) {
    const address = row.address;
    if (!address || String(address).trim().length === 0) continue;
    const coords = await geocode(client, apiKey, address);
    if (!coords) {
      processed++;
      continue;
    }
    await client.query(
      "UPDATE cv_assistant_external_jobs SET location_lat=$1, location_lon=$2 WHERE id=$3",
      [coords.lat, coords.lon, row.id],
    );
    processed++;
    if (processed % 25 === 0) log(`Jobs progress: ${processed}/${jobs.rows.length}`);
    await sleep(PER_REQUEST_DELAY_MS);
  }
  log(`Jobs done: ${processed} processed`);
}

async function geocode(client, apiKey, rawAddress) {
  const address = String(rawAddress).trim().toLowerCase().replace(/\s+/g, " ");
  if (address.length === 0) return null;

  const cached = await client.query(
    "SELECT lat, lon FROM cv_assistant_geocode_cache WHERE address=$1",
    [address],
  );
  if (cached.rows.length > 0) {
    return { lat: cached.rows[0].lat, lon: cached.rows[0].lon };
  }

  try {
    const params = new URLSearchParams({
      address: `${address}, South Africa`,
      key: apiKey,
      region: "za",
    });
    const res = await fetch(`${GEOCODE_URL}?${params.toString()}`);
    if (!res.ok) {
      log(`Google HTTP ${res.status} for "${address}"`);
      return null;
    }
    const data = await res.json();
    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      log(`Google ${data.status} for "${address}"`);
      return null;
    }
    const loc = data.results[0].geometry.location;
    const rounded = { lat: roundCoord(loc.lat), lon: roundCoord(loc.lng) };
    await client.query(
      `INSERT INTO cv_assistant_geocode_cache (address, lat, lon, provider)
       VALUES ($1, $2, $3, 'google')
       ON CONFLICT (address) DO NOTHING`,
      [address, rounded.lat, rounded.lon],
    );
    return rounded;
  } catch (err) {
    log(`Geocode threw for "${address}": ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

function roundCoord(value) {
  const factor = 10 ** COORD_PRECISION;
  return Math.round(value * factor) / factor;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message) {
  writeSync(stderr.fd, `[${new Date().toISOString()}] ${message}\n`);
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
