import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const mockUserService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const dto: CreateUserDto = { username: 'john', email: 'john@test.com', password: '123456' };
      const result: Partial<User> = { id: 1, username: 'john', email: 'john@test.com', roles: [] };

      mockUserService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(mockUserService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users: Partial<User>[] = [{ id: 1, username: 'john', email: 'john@test.com', roles: [] }];
      mockUserService.findAll.mockResolvedValue(users);

      expect(await controller.findAll()).toEqual(users);
      expect(mockUserService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const user: Partial<User> = { id: 1, username: 'john', email: 'john@test.com', roles: [] };
      mockUserService.findOne.mockResolvedValue(user);

      expect(await controller.findOne('1')).toEqual(user);
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const dto: UpdateUserDto = { username: 'john_updated' };
      const updatedUser: Partial<User> = { id: 1, username: 'john_updated', email: 'john@test.com', roles: [] };

      mockUserService.update.mockResolvedValue(updatedUser);

      expect(await controller.update('1', dto)).toEqual(updatedUser);
      expect(mockUserService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockUserService.remove.mockResolvedValue({ deleted: true });

      expect(await controller.remove('1')).toEqual({ deleted: true });
      expect(mockUserService.remove).toHaveBeenCalledWith(1);
    });
  });
});
