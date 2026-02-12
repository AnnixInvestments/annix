import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRolesService } from './user-roles.service';
import { UserRole } from './entities/user-role.entity';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

const mockUserRoleRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('UserRolesService', () => {
  let service: UserRolesService;
  let repo: jest.Mocked<Repository<UserRole>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRolesService,
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo }
      ],
    }).compile();

    service = module.get<UserRolesService>(UserRolesService);
    repo = module.get(getRepositoryToken(UserRole));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const dto = { name: 'admin' };
      mockUserRoleRepo.findOne.mockResolvedValue(null);
      const roleEntity = { id: 1, name: 'admin' } as UserRole;
      mockUserRoleRepo.create.mockReturnValue(roleEntity);
      mockUserRoleRepo.save.mockResolvedValue(roleEntity);

      const result = await service.create(dto);

      expect(mockUserRoleRepo.create).toHaveBeenCalledWith(dto);
      expect(mockUserRoleRepo.save).toHaveBeenCalledWith(roleEntity);
      expect(result).toEqual(roleEntity);
    });

    it('should throw ConflictException if role exists', async () => {
      const dto: CreateUserRoleDto = { name: 'admin' };
      
      (repo.findOne as jest.Mock).mockResolvedValue({ id: 1, name: 'admin', users: [] });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const roles: UserRole[] = [{ id: 1, name: 'admin', users: [] }];
      (repo.find as jest.Mock).mockResolvedValue(roles);

      const result = await service.findAll();

      expect(result).toEqual(roles);
      expect(repo.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a role by ID', async () => {
      const role: UserRole = { id: 1, name: 'admin', users: [] };
      (repo.findOne as jest.Mock).mockResolvedValue(role);

      const result = await service.findOne(1);

      expect(result).toEqual(role);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if role does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const role: UserRole = { id: 1, name: 'admin', users: [] };
      const dto: UpdateUserRoleDto = { name: 'superadmin' };
      const updated: UserRole = { id: 1, name: 'superadmin', users: [] };

      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(role) 
        .mockResolvedValueOnce(null);
      (repo.save as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result).toEqual(updated);
      expect(repo.save).toHaveBeenCalledWith({ ...role, ...dto });
    });

    it('should throw ConflictException if new name already exists', async () => {
      const role: UserRole = { id: 1, name: 'admin', users: [] };
      const dto: UpdateUserRoleDto = { name: 'manager' };
      const existing: UserRole = { id: 2, name: 'manager', users: [] };

      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(role)
        .mockResolvedValueOnce(existing); 

      await expect(service.update(1, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a role', async () => {
      const role: UserRole = { id: 1, name: 'admin', users: [] };
      (repo.findOne as jest.Mock).mockResolvedValue(role);
      (repo.remove as jest.Mock).mockResolvedValue(role);

      await service.remove(1);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repo.remove).toHaveBeenCalledWith(role);
    });

    it('should throw NotFoundException if role not found', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
