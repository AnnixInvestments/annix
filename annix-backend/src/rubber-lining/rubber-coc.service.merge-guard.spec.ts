import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { RubberCocService } from "./rubber-coc.service";

// Regression cover for the "R" incident: re-extraction OCR'd three distinct
// calender-roll certs to the same junk CoC number, and the duplicate-versioning
// logic collapsed them into one version chain. The reliability guard must stop
// auto-versioning from ever firing off such a degenerate value.
describe("RubberCocService — CoC-number reliability guard", () => {
  const buildService = () => {
    const versioningService = {
      existingActiveSupplierCoc: jest.fn().mockResolvedValue(null),
    };
    // Only versioningService is exercised by the guarded paths; the rest are
    // never touched before the method returns, so undefined placeholders are safe.
    const service = new RubberCocService(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      versioningService as never,
      undefined as never,
    );
    return { service, versioningService };
  };

  it("does not version-merge on a degenerate OCR number like 'R'", async () => {
    const { service, versioningService } = buildService();

    const result = await service.mergeIfDuplicateCocNumber(275, "R", SupplierCocType.CALENDER_ROLL);

    expect(result.merged).toBe(false);
    // Guard returns before ever looking for an existing active duplicate.
    expect(versioningService.existingActiveSupplierCoc).not.toHaveBeenCalled();
  });

  it("still checks for duplicates on a real CoC number", async () => {
    const { service, versioningService } = buildService();

    await service.mergeIfDuplicateCocNumber(275, "168-40914", SupplierCocType.CALENDER_ROLL);

    expect(versioningService.existingActiveSupplierCoc).toHaveBeenCalled();
  });

  it("classifies CoC numbers by reliability", () => {
    const { service } = buildService();
    const isReliable = (v: unknown) =>
      (service as never as { isReliableCocNumber(v: unknown): boolean }).isReliableCocNumber(v);

    expect(isReliable("168-40914")).toBe(true);
    expect(isReliable("COC-277")).toBe(true);
    expect(isReliable("B26-43")).toBe(true);
    expect(isReliable("R")).toBe(false);
    expect(isReliable("--")).toBe(false);
    expect(isReliable("")).toBe(false);
    expect(isReliable(null)).toBe(false);
  });
});
