import * as fs from "node:fs";
import * as path from "node:path";
import { SAGE_HEAVY_ENDPOINTS, SAGE_RATE_LIMITS } from "./sage-rate-limiter";

const SRC_DIR = path.resolve(__dirname, "..");

const SAGE_API_HOSTS = [
  // eslint-disable-next-line no-restricted-syntax -- canonical compliance test asserting no other files contain these hosts
  "accounting.sageone.co.za",
  // eslint-disable-next-line no-restricted-syntax -- canonical compliance test
  "api.accounting.sage.com",
  // eslint-disable-next-line no-restricted-syntax -- canonical compliance test
  "oauth.accounting.sage.com",
  // eslint-disable-next-line no-restricted-syntax -- canonical compliance test
  "sageone.com",
];

const ALLOWED_SAGE_CALLERS = [
  "sage-export/sage-api.service.ts",
  "comply-sa/comply-integrations/sage/sage.service.ts",
  "lib/sage-rate-limiter.ts",
  "scripts/test-sage-api.ts",
];

const collectTsFiles = (dir: string, files: string[] = []): string[] => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      collectTsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts")) {
      files.push(fullPath);
    }
  });
  return files;
};

describe("Sage DLA Compliance Guards", () => {
  describe("rate limit constants match DLA requirements", () => {
    it("should cap per-minute requests at 100 (DLA 12.4.1)", () => {
      expect(SAGE_RATE_LIMITS.MAX_PER_MINUTE).toBe(100);
    });

    it("should cap daily requests at 2500 (DLA 12.4.2)", () => {
      expect(SAGE_RATE_LIMITS.MAX_PER_DAY).toBe(2500);
    });

    it("should enforce minimum 1 second spacing (DLA 12.4.1)", () => {
      expect(SAGE_RATE_LIMITS.MIN_INTERVAL_MS).toBeGreaterThanOrEqual(1000);
    });

    it("should list all DLA-designated heavy endpoints (DLA 12.4.5)", () => {
      const requiredEndpoints = [
        "DetailedLedgerTransaction",
        "CustomerAgeing",
        "SupplierAgeing",
        "TrialBalance",
        "TaxReport",
      ];

      requiredEndpoints.forEach((endpoint) => {
        expect(SAGE_HEAVY_ENDPOINTS).toContain(endpoint);
      });
    });
  });

  describe("no direct Sage HTTP calls outside authorised services (DLA 2.4, 2.7)", () => {
    const tsFiles = collectTsFiles(SRC_DIR);

    it("should only reference Sage API hosts from authorised service files", () => {
      const violations: string[] = [];

      tsFiles.forEach((filePath) => {
        const relativePath = path.relative(SRC_DIR, filePath).replace(/\\/g, "/");
        const isAllowed = ALLOWED_SAGE_CALLERS.some((allowed) => relativePath.includes(allowed));

        if (!isAllowed) {
          const content = fs.readFileSync(filePath, "utf-8");
          SAGE_API_HOSTS.forEach((host) => {
            if (content.includes(host)) {
              violations.push(`${relativePath} references ${host}`);
            }
          });
        }
      });

      expect(violations).toEqual([]);
    });
  });
});
