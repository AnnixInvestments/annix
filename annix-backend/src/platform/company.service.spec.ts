import { CompanyService } from "./company.service";

describe("CompanyService", () => {
  let service: CompanyService;
  let companyRepo: {
    findById: jest.Mock;
    search: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    companiesWithModule: jest.Mock;
  };
  let subscriptionRepo: {
    findActiveByCompany: jest.Mock;
    findByCompanyAndModule: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findAllByCompany: jest.Mock;
  };
  let stockControlCompanyRepo: { findById: jest.Mock };
  let rubberCompanyRepo: { findById: jest.Mock };

  beforeEach(() => {
    companyRepo = {
      findById: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      companiesWithModule: jest.fn(),
    };
    subscriptionRepo = {
      findActiveByCompany: jest.fn(),
      findByCompanyAndModule: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAllByCompany: jest.fn(),
    };
    stockControlCompanyRepo = { findById: jest.fn() };
    rubberCompanyRepo = { findById: jest.fn() };

    service = new CompanyService(
      companyRepo as never,
      subscriptionRepo as never,
      stockControlCompanyRepo as never,
      rubberCompanyRepo as never,
    );
  });

  it("derives enabled Core apps from app-owned company rows", async () => {
    stockControlCompanyRepo.findById.mockResolvedValue({ id: 7 });
    rubberCompanyRepo.findById.mockResolvedValue({ id: 7 });

    await expect(service.enabledApps(7)).resolves.toEqual(["stock-control", "au-rubber"]);

    expect(stockControlCompanyRepo.findById).toHaveBeenCalledWith(7);
    expect(rubberCompanyRepo.findById).toHaveBeenCalledWith(7);
    expect(subscriptionRepo.findActiveByCompany).not.toHaveBeenCalled();
  });

  it("returns only the app ownership records that exist", async () => {
    stockControlCompanyRepo.findById.mockResolvedValue({ id: 8 });
    rubberCompanyRepo.findById.mockResolvedValue(null);

    await expect(service.enabledApps(8)).resolves.toEqual(["stock-control"]);
  });

  it("returns no Core apps when the company owns neither app row", async () => {
    stockControlCompanyRepo.findById.mockResolvedValue(null);
    rubberCompanyRepo.findById.mockResolvedValue(null);

    await expect(service.enabledApps(9)).resolves.toEqual([]);
  });

  it("reports unknown Core app gate state when no explicit subscription exists", async () => {
    subscriptionRepo.findByCompanyAndModule.mockResolvedValue(null);

    await expect(service.coreAppAccessState(7, "stock-control")).resolves.toBe("unknown");
  });

  it("reports enabled Core app gate state when an explicit subscription is active", async () => {
    subscriptionRepo.findByCompanyAndModule.mockResolvedValue({ disabledAt: null });

    await expect(service.coreAppAccessState(7, "stock-control")).resolves.toBe("enabled");
  });

  it("reports disabled Core app gate state when an explicit subscription is disabled", async () => {
    subscriptionRepo.findByCompanyAndModule.mockResolvedValue({ disabledAt: new Date() });

    await expect(service.coreAppAccessState(7, "au-rubber")).resolves.toBe("disabled");
  });
});
