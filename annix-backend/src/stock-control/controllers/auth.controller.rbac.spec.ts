import { Test, TestingModule } from "@nestjs/testing";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { StockControlAuthService } from "../services/auth.service";
import { BrandingScraperService } from "../services/branding-scraper.service";
import { LookupService } from "../services/lookup.service";
import { RbacConfigService } from "../services/rbac-config.service";
import { StockControlAuthController } from "./auth.controller";

describe("StockControlAuthController - RBAC endpoints", () => {
  let controller: StockControlAuthController;
  let rbacConfigService: { navConfig: jest.Mock; updateNavConfig: jest.Mock };

  const mockReq = (companyId: number) => ({
    user: { id: 1, companyId, role: "admin" },
  });

  beforeEach(async () => {
    rbacConfigService = {
      navConfig: jest.fn(),
      updateNavConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockControlAuthController],
      providers: [
        {
          provide: StockControlAuthService,
          useValue: {},
        },
        {
          provide: BrandingScraperService,
          useValue: {},
        },
        {
          provide: LookupService,
          useValue: {},
        },
        {
          provide: RbacConfigService,
          useValue: rbacConfigService,
        },
      ],
    })
      .overrideGuard(StockControlAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(StockControlRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StockControlAuthController>(StockControlAuthController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("rbacConfig (GET)", () => {
    it("should return nav config for the authenticated user company", async () => {
      const expectedConfig = {
        dashboard: ["viewer", "storeman", "accounts", "manager", "admin"],
        settings: ["admin"],
      };
      rbacConfigService.navConfig.mockResolvedValue(expectedConfig);

      const result = await controller.rbacConfig(mockReq(7));

      expect(rbacConfigService.navConfig).toHaveBeenCalledWith(7);
      expect(result).toEqual(expectedConfig);
    });

    it("should pass the companyId from the JWT user", async () => {
      rbacConfigService.navConfig.mockResolvedValue({});

      await controller.rbacConfig(mockReq(42));

      expect(rbacConfigService.navConfig).toHaveBeenCalledWith(42);
    });
  });

  describe("updateRbacConfig (PATCH)", () => {
    it("should pass config and companyId to the service", async () => {
      const config = {
        dashboard: ["viewer", "admin"],
        inventory: ["admin"],
      };
      const expectedResult = { ...config, settings: ["admin"] };
      rbacConfigService.updateNavConfig.mockResolvedValue(expectedResult);

      const result = await controller.updateRbacConfig(mockReq(7), { config });

      expect(rbacConfigService.updateNavConfig).toHaveBeenCalledWith(7, config);
      expect(result).toEqual(expectedResult);
    });

    it("should use the companyId from JWT, not from the body", async () => {
      const config = { dashboard: ["admin"] };
      rbacConfigService.updateNavConfig.mockResolvedValue(config);

      await controller.updateRbacConfig(mockReq(99), { config });

      expect(rbacConfigService.updateNavConfig).toHaveBeenCalledWith(99, config);
    });
  });
});
