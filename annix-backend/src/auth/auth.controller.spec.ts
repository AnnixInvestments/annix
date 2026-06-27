import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { Request } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LoginUserDto } from "./dto/login-user.dto";
import { CoreAuthThrottlerGuard } from "./guards/auth-throttler.guard";

describe("AuthController", () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(CoreAuthThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("login", () => {
    const dto: LoginUserDto = { email: "test@example.com", password: "123456" };

    it("should return access token if credentials are valid", async () => {
      const user = { id: 1, username: "test", roles: ["user"] };
      const token = {
        access_token: "jwt-token",
        refresh_token: "refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      service.validateUser.mockResolvedValue(user);
      service.login.mockResolvedValue(token);

      const req = { ip: "127.0.0.1", headers: {} } as unknown as Request;
      const result = await controller.login(dto, req);
      expect(service.validateUser).toHaveBeenCalledWith(dto.email, dto.password, "127.0.0.1");
      expect(service.login).toHaveBeenCalledWith(user, "127.0.0.1");
      expect(result).toEqual(token);
    });

    it("should throw UnauthorizedException if validateUser returns null", async () => {
      service.validateUser.mockResolvedValue(null);

      const req = { ip: "127.0.0.1", headers: {} } as unknown as Request;
      await expect(controller.login(dto, req)).rejects.toThrow(UnauthorizedException);
      expect(service.validateUser).toHaveBeenCalledWith(dto.email, dto.password, "127.0.0.1");
      expect(service.login).not.toHaveBeenCalled();
    });
  });
});
