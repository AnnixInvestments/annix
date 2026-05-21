import * as fs from "node:fs";
import * as path from "node:path";

const AI_SERVICE_FILES = [
  "src/annix-orbit/services/job-match.service.ts",
  "src/annix-orbit/services/cv-screening.service.ts",
  "src/annix-orbit/services/candidate-job-matching.service.ts",
  "src/annix-orbit/services/embedding.service.ts",
] as const;

const FORBIDDEN_SYMBOLS = [
  "AnnixOrbitCandidateEeAttributes",
  "AnnixOrbitEeConsentTextVersion",
  "AnnixOrbitEeDisclosureInvite",
  "AnnixOrbitEeSectoralTarget",
  "candidate-ee-attributes",
  "ee-consent-text-version",
  "ee-disclosure-invite",
  "ee-sectoral-target",
  "PopiaService",
  "EeDisclosureService",
  "popia.service",
  "ee-disclosure.service",
  "cv_assistant_candidate_ee_attributes",
  "cv_assistant_ee_consent_text_versions",
  "cv_assistant_ee_disclosure_invites",
  "cv_assistant_ee_sectoral_targets",
] as const;

describe("EE compliance — AI firewall (issue #240 Phase B)", () => {
  describe.each(AI_SERVICE_FILES)("%s", (relativeFile) => {
    const absolute = path.join(process.cwd(), relativeFile);
    const source = fs.readFileSync(absolute, "utf8");

    it.each(FORBIDDEN_SYMBOLS)("must not reference %s", (symbol) => {
      expect(source).not.toContain(symbol);
    });
  });
});
