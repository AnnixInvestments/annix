import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { StockControlRole } from "../stock-control/entities/stock-control-user.entity";
import type { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import type { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { PlatformCompanyAuthGuard } from "./platform-company-auth.guard";

type GuardRequest = Partial<Request> & {
  user?: unknown;
};

describe("PlatformCompanyAuthGuard", () => {
  let jwtService: { verify: jest.Mock };
  let profileRepo: { findOneByUserId: jest.Mock };
  let userRepo: { findOneForCompany: jest.Mock };
  let guard: PlatformCompanyAuthGuard;

  const contextFor = (request: GuardRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn().mockReturnValue({
        sub: 42,
        email: "user@example.com",
        name: "Portal User",
        type: "stock-control",
      }),
    };
    profileRepo = {
      findOneByUserId: jest.fn().mockResolvedValue({
        userId: 42,
        companyId: 7,
        legacyScUserId: 11,
      }),
    };
    userRepo = {
      findOneForCompany: jest.fn().mockResolvedValue({
        id: 11,
        role: StockControlRole.ADMIN,
      }),
    };
    guard = new PlatformCompanyAuthGuard(
      jwtService as unknown as JwtService,
      profileRepo as unknown as StockControlProfileRepository,
      userRepo as unknown as StockControlUserRepository,
    );
  });

  it("accepts a Stock Control bearer access token and attaches the persisted company scope", async () => {
    const request = { headers: { authorization: "Bearer access-token" } } as GuardRequest;

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

    expect(jwtService.verify).toHaveBeenCalledWith("access-token");
    expect(profileRepo.findOneByUserId).toHaveBeenCalledWith(42);
    expect(userRepo.findOneForCompany).toHaveBeenCalledWith(11, 7);
    expect(request.user).toEqual({
      id: 42,
      email: "user@example.com",
      name: "Portal User",
      role: StockControlRole.ADMIN,
      companyId: 7,
      scUserId: 11,
      unifiedUserId: 42,
      unifiedCompanyId: 7,
    });
  });

  it("does not accept query-string tokens", async () => {
    const request = {
      headers: {},
      query: { token: "query-token" },
    } as GuardRequest;

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(UnauthorizedException);

    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it("rejects refresh tokens", async () => {
    jwtService.verify.mockReturnValue({
      sub: 42,
      companyId: 7,
      tokenType: "refresh",
      type: "stock-control",
    });

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer refresh-token" } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects tokens without a Stock Control profile", async () => {
    profileRepo.findOneByUserId.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer access-token" } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects cross-company route access before the controller runs", async () => {
    const request = {
      headers: { authorization: "Bearer access-token" },
      params: { companyId: "8" },
    } as GuardRequest;

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(ForbiddenException);
  });

  it("allows matching company route access", async () => {
    const request = {
      headers: { authorization: "Bearer access-token" },
      params: { companyId: "7" },
    } as GuardRequest;

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
  });
});
