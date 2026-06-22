import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { StockControlRole } from "../entities/stock-control-user.entity";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { StockControlAuthGuard } from "./stock-control-auth.guard";

describe("StockControlAuthGuard", () => {
  const buildContext = (token: string | null) => {
    const request = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      query: {},
      user: undefined as unknown,
    };
    return {
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as never,
      request,
    };
  };

  const buildGuard = (overrides: {
    verify?: jest.Mock;
    findOneByUserId?: jest.Mock;
    findOneForCompany?: jest.Mock;
  }) => {
    const jwtService = {
      verify: overrides.verify ?? jest.fn(),
    } as unknown as JwtService;
    const profileRepo = {
      findOneByUserId: overrides.findOneByUserId ?? jest.fn(),
    } as unknown as StockControlProfileRepository;
    const userRepo = {
      findOneForCompany: overrides.findOneForCompany ?? jest.fn(),
    } as unknown as StockControlUserRepository;
    return new StockControlAuthGuard(jwtService, profileRepo, userRepo);
  };

  it("rejects a missing token", async () => {
    const guard = buildGuard({});
    const { context } = buildContext(null);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a non-stock-control token type", async () => {
    const guard = buildGuard({ verify: jest.fn().mockReturnValue({ type: "customer", sub: 1 }) });
    const { context } = buildContext("token");
    await expect(guard.canActivate(context)).rejects.toThrow("Invalid token type");
  });

  it("rejects a refresh token even when otherwise valid", async () => {
    const findOneByUserId = jest.fn();
    const guard = buildGuard({
      verify: jest
        .fn()
        .mockReturnValue({ type: "stock-control", tokenType: "refresh", sub: 1, companyId: 7 }),
      findOneByUserId,
    });
    const { context } = buildContext("refresh-token");
    await expect(guard.canActivate(context)).rejects.toThrow(
      "Refresh tokens are not accepted on this route",
    );
    expect(findOneByUserId).not.toHaveBeenCalled();
  });

  it("rejects when no profile is found rather than trusting JWT claims", async () => {
    const guard = buildGuard({
      verify: jest
        .fn()
        .mockReturnValue({ type: "stock-control", sub: 5, role: "admin", companyId: 99 }),
      findOneByUserId: jest.fn().mockResolvedValue(null),
    });
    const { context } = buildContext("access-token");
    await expect(guard.canActivate(context)).rejects.toThrow("Stock Control profile not found");
  });

  it("derives companyId from the profile and role from the legacy user, ignoring JWT claims", async () => {
    const guard = buildGuard({
      verify: jest.fn().mockReturnValue({
        type: "stock-control",
        sub: 5,
        email: "user@example.com",
        name: "Test User",
        role: "admin",
        companyId: 99,
      }),
      findOneByUserId: jest.fn().mockResolvedValue({ companyId: 42, legacyScUserId: 11 }),
      findOneForCompany: jest.fn().mockResolvedValue({ id: 11, role: StockControlRole.MANAGER }),
    });
    const { context, request } = buildContext("access-token");

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toEqual({
      id: 5,
      email: "user@example.com",
      name: "Test User",
      role: StockControlRole.MANAGER,
      companyId: 42,
      unifiedUserId: 5,
      unifiedCompanyId: 42,
    });
  });

  it("falls back to storeman when no legacy user is linked", async () => {
    const guard = buildGuard({
      verify: jest
        .fn()
        .mockReturnValue({ type: "stock-control", sub: 5, role: "admin", companyId: 99 }),
      findOneByUserId: jest.fn().mockResolvedValue({ companyId: 42, legacyScUserId: null }),
      findOneForCompany: jest.fn(),
    });
    const { context, request } = buildContext("access-token");

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect((request.user as { role: string }).role).toBe(StockControlRole.STOREMAN);
  });

  it("rejects an unverifiable token", async () => {
    const guard = buildGuard({
      verify: jest.fn().mockImplementation(() => {
        throw new Error("jwt expired");
      }),
    });
    const { context } = buildContext("bad-token");
    await expect(guard.canActivate(context)).rejects.toThrow("Invalid or expired token");
  });
});
