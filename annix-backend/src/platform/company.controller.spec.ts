import { ForbiddenException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { CompanyController } from "./company.controller";
import { PlatformCompanyAuthGuard } from "./platform-company-auth.guard";

describe("CompanyController", () => {
  let controller: CompanyController;
  let companyService: {
    findById: jest.Mock;
    activeModules: jest.Mock;
    enableModule: jest.Mock;
    disableModule: jest.Mock;
  };

  const request = (user: Record<string, unknown>) => ({ user }) as never;
  const routeGuards = (methodName: keyof CompanyController) =>
    Reflect.getMetadata(GUARDS_METADATA, controller[methodName]) as unknown[];

  beforeEach(async () => {
    companyService = {
      findById: jest.fn().mockResolvedValue({ id: 7, name: "Annix" }),
      activeModules: jest.fn().mockResolvedValue(["stock-control"]),
      enableModule: jest.fn(),
      disableModule: jest.fn(),
    };

    controller = new CompanyController(companyService as never);
  });

  it("allows a caller to read their own company", async () => {
    await expect(controller.findOne(7, request({ companyId: 7 }))).resolves.toEqual({
      id: 7,
      name: "Annix",
    });

    expect(companyService.findById).toHaveBeenCalledWith(7);
  });

  it("allows a caller to read their own modules", async () => {
    await expect(controller.activeModules(7, request({ companyId: 7 }))).resolves.toEqual([
      "stock-control",
    ]);

    expect(companyService.activeModules).toHaveBeenCalledWith(7);
  });

  it("denies cross-company reads before the service is called", () => {
    expect(() => controller.findOne(8, request({ companyId: 7 }))).toThrow(ForbiddenException);
    expect(() => controller.activeModules(8, request({ companyId: 7 }))).toThrow(
      ForbiddenException,
    );

    expect(companyService.findById).not.toHaveBeenCalled();
    expect(companyService.activeModules).not.toHaveBeenCalled();
  });

  it("does not treat a stock-control role as cross-company access", () => {
    expect(() => controller.findOne(8, request({ companyId: 7, role: "admin" }))).toThrow(
      ForbiddenException,
    );
  });

  it("denies reads without a guard-populated company", () => {
    expect(() => controller.findOne(7, request({}))).toThrow(ForbiddenException);
  });

  it("uses the platform company guard for tenant-scoped reads", () => {
    expect(routeGuards("findOne")).toEqual([PlatformCompanyAuthGuard]);
    expect(routeGuards("activeModules")).toEqual([PlatformCompanyAuthGuard]);
  });

  it("uses validated admin auth for module administration", () => {
    expect(routeGuards("enableModule")).toEqual([AdminAuthGuard, RolesGuard]);
    expect(routeGuards("disableModule")).toEqual([AdminAuthGuard, RolesGuard]);
  });
});
