import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
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
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const dto: LoginUserDto = { email: 'test@example.com', password: '123456' };

    it('should return access token if credentials are valid', async () => {
      const user = { id: 1, username: 'test', roles: ['user'] };
      const token = { access_token: 'jwt-token' };

      service.validateUser.mockResolvedValue(user);
      service.login.mockResolvedValue(token);

      const result = await controller.login(dto);
      expect(service.validateUser).toHaveBeenCalledWith(dto.email, dto.password);
      expect(service.login).toHaveBeenCalledWith(user);
      expect(result).toEqual(token);
    });

    it('should throw UnauthorizedException if validateUser returns null', async () => {
      service.validateUser.mockResolvedValue(null);

      await expect(controller.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(service.validateUser).toHaveBeenCalledWith(dto.email, dto.password);
      expect(service.login).not.toHaveBeenCalled();
    });
  });
});
