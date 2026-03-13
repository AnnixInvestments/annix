import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";
import { AnnixRepAuthController } from "./annix-rep-auth.controller";
import { AnnixRepAuthService } from "./annix-rep-auth.service";
import {
  AnnixRepAuthResponseDto,
  AnnixRepLoginDto,
  AnnixRepProfileResponseDto,
  AnnixRepRefreshTokenDto,
  AnnixRepRegisterDto,
} from "./dto";
import { AnnixRepAuthGuard } from "./guards";

describe("AnnixRepAuthController", () => {
  let controller: AnnixRepAuthController;
  let service: jest.Mocked<AnnixRepAuthService>;

  const mockAuthResponse: AnnixRepAuthResponseDto = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresIn: 3600,
    userId: 1,
    email: "rep@company.com",
    firstName: "John",
    lastName: "Doe",
    setupCompleted: true,
  };

  const mockProfileResponse: AnnixRepProfileResponseDto = {
    userId: 1,
    email: "rep@company.com",
    firstName: "John",
    lastName: "Doe",
    setupCompleted: true,
  };

  const mockRequest = {
    annixRepUser: {
      userId: 1,
      email: "rep@company.com",
      sessionToken: "test-session-token",
    },
  };

  beforeEach(async () => {
    const mockService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshSession: jest.fn(),
      profile: jest.fn(),
      checkEmailAvailable: jest.fn(),
      isOAuthProviderConfigured: jest.fn(),
      oauthAuthorizationUrl: jest.fn(),
      oauthLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnixRepAuthController],
      providers: [{ provide: AnnixRepAuthService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnnixRepAuthController>(AnnixRepAuthController);
    service = module.get(AnnixRepAuthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /register", () => {
    const dto: AnnixRepRegisterDto = {
      email: "newrep@company.com",
      password: "SecurePass123!",
      firstName: "Jane",
      lastName: "Smith",
    };

    it("should register and return auth response", async () => {
      service.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(dto, "127.0.0.1", "Mozilla/5.0");

      expect(result).toEqual(mockAuthResponse);
      expect(service.register).toHaveBeenCalledWith(dto, "127.0.0.1", "Mozilla/5.0");
    });

    it("should default user agent to unknown when not provided", async () => {
      service.register.mockResolvedValue(mockAuthResponse);

      await controller.register(dto, "127.0.0.1", "");

      expect(service.register).toHaveBeenCalledWith(dto, "127.0.0.1", "unknown");
    });
  });

  describe("POST /login", () => {
    const dto: AnnixRepLoginDto = {
      email: "rep@company.com",
      password: "SecurePass123!",
    };

    it("should login and return auth response", async () => {
      service.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(dto, "127.0.0.1", "Mozilla/5.0");

      expect(result).toEqual(mockAuthResponse);
      expect(service.login).toHaveBeenCalledWith(dto, "127.0.0.1", "Mozilla/5.0");
    });

    it("should default user agent to unknown when not provided", async () => {
      service.login.mockResolvedValue(mockAuthResponse);

      await controller.login(dto, "127.0.0.1", "");

      expect(service.login).toHaveBeenCalledWith(dto, "127.0.0.1", "unknown");
    });
  });

  describe("POST /logout", () => {
    it("should logout and return success", async () => {
      service.logout.mockResolvedValue();

      const result = await controller.logout(mockRequest);

      expect(result).toEqual({ success: true });
      expect(service.logout).toHaveBeenCalledWith("test-session-token");
    });
  });

  describe("POST /refresh", () => {
    const dto: AnnixRepRefreshTokenDto = {
      refreshToken: "valid-refresh-token",
    };

    it("should refresh and return new auth response", async () => {
      service.refreshSession.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(dto, "127.0.0.1", "Mozilla/5.0");

      expect(result).toEqual(mockAuthResponse);
      expect(service.refreshSession).toHaveBeenCalledWith(dto, "127.0.0.1", "Mozilla/5.0");
    });

    it("should default user agent to unknown when not provided", async () => {
      service.refreshSession.mockResolvedValue(mockAuthResponse);

      await controller.refresh(dto, "127.0.0.1", "");

      expect(service.refreshSession).toHaveBeenCalledWith(dto, "127.0.0.1", "unknown");
    });
  });

  describe("GET /profile", () => {
    it("should return user profile", async () => {
      service.profile.mockResolvedValue(mockProfileResponse);

      const result = await controller.profile(mockRequest);

      expect(result).toEqual(mockProfileResponse);
      expect(service.profile).toHaveBeenCalledWith(1);
    });
  });

  describe("GET /check-email", () => {
    it("should return available true when email is free", async () => {
      service.checkEmailAvailable.mockResolvedValue(true);

      const result = await controller.checkEmail("new@company.com");

      expect(result).toEqual({ available: true });
      expect(service.checkEmailAvailable).toHaveBeenCalledWith("new@company.com");
    });

    it("should return available false when email is taken", async () => {
      service.checkEmailAvailable.mockResolvedValue(false);

      const result = await controller.checkEmail("existing@company.com");

      expect(result).toEqual({ available: false });
    });
  });

  describe("GET /oauth/callback", () => {
    const mockRes = (): jest.Mocked<Response> =>
      ({ redirect: jest.fn() }) as unknown as jest.Mocked<Response>;

    it("should redirect with error when error query param is present", async () => {
      const res = mockRes();

      await controller.oauthCallback("", "", "access_denied", "127.0.0.1", "agent", res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=access_denied"));
    });

    it("should redirect with error when code is missing", async () => {
      const res = mockRes();

      await controller.oauthCallback("", "state", "", "127.0.0.1", "agent", res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=missing_code"));
    });

    it("should redirect with error when state is missing", async () => {
      const res = mockRes();

      await controller.oauthCallback("code", "", "", "127.0.0.1", "agent", res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=missing_code"));
    });

    it("should redirect with error for invalid provider", async () => {
      const res = mockRes();
      const state = `invalid:${Buffer.from("/annix-rep").toString("base64")}`;

      await controller.oauthCallback("code", state, "", "127.0.0.1", "agent", res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=invalid_provider"));
    });

    it("should redirect with success params on successful OAuth login", async () => {
      const res = mockRes();
      const state = `google:${Buffer.from("/annix-rep/dashboard").toString("base64")}`;
      service.oauthLogin.mockResolvedValue(mockAuthResponse);

      await controller.oauthCallback("auth-code", state, "", "127.0.0.1", "agent", res);

      expect(service.oauthLogin).toHaveBeenCalledWith(
        "google",
        "auth-code",
        expect.stringContaining("/annix-rep/auth/oauth/callback"),
        "127.0.0.1",
        "agent",
      );
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("oauth=success"));
    });

    it("should redirect with error when oauthLogin throws", async () => {
      const res = mockRes();
      const state = `google:${Buffer.from("/annix-rep").toString("base64")}`;
      service.oauthLogin.mockRejectedValue(new Error("OAuth failed"));

      await controller.oauthCallback("auth-code", state, "", "127.0.0.1", "agent", res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=OAuth%20failed"));
    });

    it("should treat teams provider as microsoft", async () => {
      const res = mockRes();
      const state = `teams:${Buffer.from("/annix-rep").toString("base64")}`;
      service.oauthLogin.mockResolvedValue(mockAuthResponse);

      await controller.oauthCallback("auth-code", state, "", "127.0.0.1", "agent", res);

      expect(service.oauthLogin).toHaveBeenCalledWith(
        "microsoft",
        "auth-code",
        expect.any(String),
        "127.0.0.1",
        "agent",
      );
    });
  });

  describe("GET /oauth/:provider", () => {
    const mockRes = (): jest.Mocked<Response> =>
      ({ redirect: jest.fn() }) as unknown as jest.Mocked<Response>;

    it("should redirect with error for invalid provider", async () => {
      const res = mockRes();

      await controller.oauthRedirect("invalid", "/annix-rep", res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=invalid_provider"));
    });

    it("should redirect with error when provider is not configured", async () => {
      const res = mockRes();
      service.isOAuthProviderConfigured.mockReturnValue(false);

      await controller.oauthRedirect("google", "/annix-rep", res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("error=provider_not_configured"),
      );
    });

    it("should redirect to authorization URL when provider is configured", async () => {
      const res = mockRes();
      service.isOAuthProviderConfigured.mockReturnValue(true);
      service.oauthAuthorizationUrl.mockReturnValue("https://accounts.google.com/auth?params");

      await controller.oauthRedirect("google", "/annix-rep/dashboard", res);

      expect(res.redirect).toHaveBeenCalledWith("https://accounts.google.com/auth?params");
    });

    it("should redirect with error when authorizationUrl returns null", async () => {
      const res = mockRes();
      service.isOAuthProviderConfigured.mockReturnValue(true);
      service.oauthAuthorizationUrl.mockReturnValue(null);

      await controller.oauthRedirect("google", "/annix-rep", res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=oauth_failed"));
    });

    it("should treat teams provider as microsoft", async () => {
      const res = mockRes();
      service.isOAuthProviderConfigured.mockReturnValue(true);
      service.oauthAuthorizationUrl.mockReturnValue("https://login.microsoftonline.com/auth");

      await controller.oauthRedirect("teams", "/annix-rep", res);

      expect(service.isOAuthProviderConfigured).toHaveBeenCalledWith("microsoft");
      expect(service.oauthAuthorizationUrl).toHaveBeenCalledWith(
        "microsoft",
        expect.any(String),
        expect.any(String),
      );
    });
  });
});
