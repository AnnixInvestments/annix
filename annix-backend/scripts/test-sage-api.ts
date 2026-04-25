/**
 * Quick test script to verify Sage One SA API connectivity.
 *
 * Usage:
 *   npx ts-node scripts/test-sage-api.ts
 *
 * Set these environment variables before running:
 *   SAGE_USERNAME    - Your Sage login email
 *   SAGE_PASSWORD    - Your Sage login password
 *   SAGE_API_KEY     - The API key from the developer portal (Client ID)
 *   SAGE_BASE_URL    - REQUIRED. Sandbox or production base URL issued by Sage.
 *                      No default — script refuses to run without it to prevent
 *                      accidental hits against production while DLA evaluation
 *                      is in progress (issue #117).
 */

const username = process.env.SAGE_USERNAME;
const password = process.env.SAGE_PASSWORD;
const apiKey = process.env.SAGE_API_KEY;
const SAGE_BASE_URL = process.env.SAGE_BASE_URL;

if (!username || !password || !apiKey) {
  console.error(
    "Missing environment variables. Set SAGE_USERNAME, SAGE_PASSWORD, and SAGE_API_KEY.",
  );
  process.exit(1);
}

if (!SAGE_BASE_URL) {
  console.error(
    "Missing SAGE_BASE_URL. Set it to the sandbox URL issued by Sage (or production once approved).",
  );
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

async function sageRequest(path: string): Promise<unknown> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${SAGE_BASE_URL}/${path}${separator}apikey=${apiKey}`;

  console.log(`\nFetching: ${SAGE_BASE_URL}/${path}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  return response.json();
}

async function main() {
  console.log("=== Sage One SA API Connection Test ===\n");
  console.log(`Username: ${username}`);
  console.log(`API Key:  ${apiKey?.substring(0, 12)}...`);

  try {
    console.log("\n--- Step 1: Fetch Companies ---");
    const companies = await sageRequest("Company/Get");
    console.log("Companies:", JSON.stringify(companies, null, 2));

    // If we got companies, try to fetch suppliers for the first one
    if (Array.isArray(companies) && companies.length > 0) {
      const companyId = companies[0].ID || companies[0].id;
      console.log(`\n--- Step 2: Fetch Suppliers (Company ${companyId}) ---`);
      const suppliers = await sageRequest(`Supplier/Get?companyid=${companyId}`);
      console.log("Suppliers:", JSON.stringify(suppliers, null, 2).substring(0, 2000));

      console.log(`\n--- Step 3: Fetch Tax Types (Company ${companyId}) ---`);
      const taxTypes = await sageRequest(`TaxType/Get?companyid=${companyId}`);
      console.log("Tax Types:", JSON.stringify(taxTypes, null, 2));
    }

    console.log("\n=== Connection test PASSED ===");
  } catch (error) {
    console.error("\n=== Connection test FAILED ===");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
