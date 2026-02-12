import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from './entities/user-role.entity';

const mockUserRolesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UserRolesController', () => {
  let controller: UserRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRolesController],
      providers: [
        {
          provide: UserRolesService,
          useValue: mockUserRolesService,
        },
      ],
    }).compile();

    controller = module.get<UserRolesController>(UserRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a role', async () => {
      const dto: CreateUserRoleDto = { name: 'admin' };
      const result: Partial<UserRole> = { id: 1, name: 'admin' };

      mockUserRolesService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(mockUserRolesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const roles: Partial<UserRole>[] = [{ id: 1, name: 'admin' }];
      mockUserRolesService.findAll.mockResolvedValue(roles);

      expect(await controller.findAll()).toEqual(roles);
      expect(mockUserRolesService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a role by ID', async () => {
      const role: Partial<UserRole> = { id: 1, name: 'admin' };
      mockUserRolesService.findOne.mockResolvedValue(role);

      expect(await controller.findOne('1')).toEqual(role);
      expect(mockUserRolesService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const dto: UpdateUserRoleDto = { name: 'superadmin' };
      const updatedRole: Partial<UserRole> = { id: 1, name: 'superadmin' };

      mockUserRolesService.update.mockResolvedValue(updatedRole);

      expect(await controller.update('1', dto)).toEqual(updatedRole);
      expect(mockUserRolesService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should delete a role', async () => {
      mockUserRolesService.remove.mockResolvedValue({ deleted: true });

      expect(await controller.remove('1')).toEqual({ deleted: true });
      expect(mockUserRolesService.remove).toHaveBeenCalledWith(1);
    });
  });
});
