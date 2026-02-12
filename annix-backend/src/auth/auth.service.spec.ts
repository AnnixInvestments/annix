import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);

    jest.resetAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data without password and salt if credentials are valid', async () => {
      const user = {
        id: 1,
        username: 'john',
        email: 'john@test.com',
        password: 'hashed_pass',
        salt: 'random_salt',
        roles: [{ id: 1, name: 'employee' }],
      } as User;

      mockUserRepo.findOne.mockResolvedValue(user);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pass');

      const result = await service.validateUser('john@test.com', '123456');

      expect(result).toEqual({
        id: 1,
        username: 'john',
        email: 'john@test.com',
        roles: [{ id: 1, name: 'employee' }],
      });
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.validateUser('nonexistent@test.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const user = {
        id: 1,
        username: 'john',
        email: 'john@test.com',
        password: 'hashed_pass',
        salt: 'random_salt',
        roles: [{ id: 1, name: 'employee' }],
      } as User;

      mockUserRepo.findOne.mockResolvedValue(user);

      (bcrypt.hash as jest.Mock).mockResolvedValue('wrong_hash');

      await expect(service.validateUser('john@test.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should return access token', async () => {
      const user = {
        id: 1,
        username: 'john',
        roles: [{ id: 1, name: 'employee' }],
      };

      mockJwtService.sign.mockReturnValue('signed_jwt_token');

      const result = await service.login(user);

      expect(result).toEqual({ access_token: 'signed_jwt_token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        username: user.username,
        roles: ['employee'],
      });
    });
  });
});
