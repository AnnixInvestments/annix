import { BoqDistributionService } from "./boq-distribution.service";

function serviceWithMocks() {
  const sourcingAccess = {
    id: 1,
    boqId: 100,
    supplierProfileId: 9,
    allowedSections: ["valves"],
    accessOrigin: "sourcing",
  };
  const distributionAccess = {
    id: 2,
    boqId: 200,
    supplierProfileId: 9,
    allowedSections: ["valves"],
    accessOrigin: undefined,
  };

  const accessRepository = {
    findBySupplierAndStatuses: jest.fn().mockResolvedValue([sourcingAccess, distributionAccess]),
    remove: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const sectionRepository = {
    findByBoqIds: jest.fn().mockResolvedValue([{ boqId: 200, sectionType: "valves" }]),
  };

  const service = new BoqDistributionService(
    {} as never,
    sectionRepository as never,
    accessRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, accessRepository, sectionRepository, sourcingAccess, distributionAccess };
}

describe("BoqDistributionService.updateSupplierAllowedSections — sourcing rows", () => {
  it("never removes or mutates access rows with accessOrigin 'sourcing'", async () => {
    const { service, accessRepository, sectionRepository, sourcingAccess } = serviceWithMocks();

    const result = await service.updateSupplierAllowedSections(9, ["fabricated_steel"]);

    expect(sectionRepository.findByBoqIds).toHaveBeenCalledWith([200]);
    expect(accessRepository.remove).toHaveBeenCalledTimes(1);
    const removed = (accessRepository.remove as jest.Mock).mock.calls[0][0];
    expect(removed.id).toBe(2);
    expect(
      (accessRepository.remove as jest.Mock).mock.calls.some((call) => call[0] === sourcingAccess),
    ).toBe(false);
    expect(result.removed).toBe(1);
  });
});
