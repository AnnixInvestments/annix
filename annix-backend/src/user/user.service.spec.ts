import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../../src/user-roles/entities/user-role.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockUserRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  delete: jest.fn(),
};

const mockUserRoleRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleRepo: jest.Mocked<Repository<UserRole>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(UserRole));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a user', async () => {
      const dto = { username: 'john', email: 'john@test.com', password: '123456' };
      const salt = 'random_salt';
      const hashedPassword = 'hashed_pass';

    (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
    (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const role = { id: 1, name: 'employee' } as UserRole;
      roleRepo.findOne.mockResolvedValue(role);

      const createdUser = { ...dto, password: hashedPassword, salt, roles: [role] } as User;
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue({ ...createdUser, id: 1 });

      const result = await service.create(dto);

      expect(userRepo.create).toHaveBeenCalledWith({
        ...dto,
        password: hashedPassword,
        salt,
      });
      expect(userRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 1, username: 'john', email: 'john@test.com' });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [{ id: 1, username: 'john', email: 'john@test.com' }] as User[];
      userRepo.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(userRepo.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      const user = { id: 1, username: 'john' } as User;
      userRepo.findOneBy.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(result).toEqual(user);
      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return a user', async () => {
      const user = { id: 1, username: 'john', password: 'old' } as User;
      jest.spyOn(service, 'findOne').mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, username: 'john_updated' });

      const result = await service.update(1, { username: 'john_updated' });

      expect(result.username).toBe('john_updated');
      expect(userRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      userRepo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.remove(1);

      expect(result).toEqual({ deleted: true });
      expect(userRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
