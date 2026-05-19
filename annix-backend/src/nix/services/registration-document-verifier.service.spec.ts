import {
  ExpectedCompanyData,
  ExtractedRegistrationData,
  FieldVerificationResult,
  RegistrationDocumentVerifierService,
} from "./registration-document-verifier.service";

/**
 * `compareFields` and its helpers (`compareField`, `calculateSimilarity`,
 * `normalizeCompanyName`) are pure — they touch no injected dependencies — so
 * an instance built without the constructor is enough to exercise them.
 */
describe("RegistrationDocumentVerifierService — company-name cross-check", () => {
  const service = Object.create(
    RegistrationDocumentVerifierService.prototype,
  ) as RegistrationDocumentVerifierService;
  // Defensive: the field-initialised logger never runs without the constructor.
  (service as unknown as { logger: unknown }).logger = {
    log() {},
    warn() {},
    error() {},
    debug() {},
  };

  const companyNameResult = (
    extracted: string,
    expected: string,
  ): FieldVerificationResult | undefined => {
    const extractedData: Partial<ExtractedRegistrationData> = { companyName: extracted };
    const expectedData: ExpectedCompanyData = { companyName: expected };
    const results: FieldVerificationResult[] = (
      service as unknown as {
        compareFields: (
          docType: string,
          e: Partial<ExtractedRegistrationData>,
          x: ExpectedCompanyData,
        ) => FieldVerificationResult[];
      }
    ).compareFields("registration", extractedData, expectedData);
    return results.find((r) => r.field === "companyName");
  };

  it("matches an identical company name", () => {
    expect(companyNameResult("AU Industries (Pty) Ltd", "AU Industries (Pty) Ltd")?.match).toBe(
      true,
    );
  });

  it("matches the same name despite letter casing", () => {
    expect(companyNameResult("AU INDUSTRIES (PTY) LTD", "AU Industries (Pty) Ltd")?.match).toBe(
      true,
    );
  });

  it("rejects a clearly different company name (the id 14 typo case)", () => {
    // A CIPC certificate reading "AU Industries" must fail the 85% fuzzy
    // threshold when the applicant typed "Polymer Lining Systems".
    const result = companyNameResult("AU Industries (Pty) Ltd", "Polymer Lining Systems (Pty) Ltd");
    expect(result?.match).toBe(false);
  });
});
