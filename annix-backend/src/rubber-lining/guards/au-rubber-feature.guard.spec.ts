import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { LicensingService } from "../../licensing/licensing.service";
import { AU_RUBBER_FEATURES, AU_RUBBER_MODULE_KEY } from "../config/au-rubber-licensing";
import { AuRubberFeatureGuard } from "./au-rubber-feature.guard";

describe("AuRubberFeatureGuard", () => {
  it("resolves licensing from the app module graph before checking a gated route", async () => {
    const isFeatureEnabled = jest.fn().mockResolvedValue(true);
    const moduleRef = {
      get: jest.fn().mockReturnValue({ isFeatureEnabled }),
    } as unknown as ModuleRef;
    const guard = new AuRubberFeatureGuard(moduleRef);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: "/rubber-lining/portal/tax-invoices",
          user: { companyId: "42", roles: [] as string[] },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(moduleRef.get).toHaveBeenCalledWith(LicensingService, { strict: false });
    expect(isFeatureEnabled).toHaveBeenCalledWith(
      42,
      AU_RUBBER_MODULE_KEY,
      AU_RUBBER_FEATURES.INVOICING_TAX,
    );
  });

  it("rejects unlicensed gated routes", async () => {
    const moduleRef = {
      get: jest.fn().mockReturnValue({ isFeatureEnabled: jest.fn().mockResolvedValue(false) }),
    } as unknown as ModuleRef;
    const guard = new AuRubberFeatureGuard(moduleRef);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: "/rubber-lining/portal/tax-invoices",
          user: { companyId: "42", roles: [] as string[] },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
