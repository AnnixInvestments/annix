import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CreateUserRoleDto } from "./dto/create-user-role.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UserRole } from "./entities/user-role.entity";
import { UserRoleRepository } from "./user-roles.repository";
import { UserRolesService } from "./user-roles.service";

const mockUserRoleRepo = {
  findByName: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  findOneWhere: jest.fn(),
  findManyWhere: jest.fn(),
  count: jest.fn(),
};

const createMockRole = (overrides: Partial<UserRole> = {}): UserRole => ({
  id: 1,
  name: "admin",
  users: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("UserRolesService", () => {
  let service: UserRolesService;
  let repo: typeof mockUserRoleRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRolesService, { provide: UserRoleRepository, useValue: mockUserRoleRepo }],
    }).compile();

    service = module.get<UserRolesService>(UserRolesService);
    repo = module.get(UserRoleRepository);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new role", async () => {
      const dto = { name: "admin" };
      repo.findByName.mockResolvedValue(null);
      const roleEntity = createMockRole();
      repo.create.mockResolvedValue(roleEntity);

      const result = await service.create(dto);

      expect(repo.findByName).toHaveBeenCalledWith(dto.name);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(roleEntity);
    });

    it("should throw ConflictException if role exists", async () => {
      const dto: CreateUserRoleDto = { name: "admin" };
      repo.findByName.mockResolvedValue(createMockRole());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe("findAll", () => {
    it("should return all roles", async () => {
      const roles: UserRole[] = [createMockRole()];
      repo.findAll.mockResolvedValue(roles);

      const result = await service.findAll();

      expect(result).toEqual(roles);
      expect(repo.findAll).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a role by ID", async () => {
      const role = createMockRole();
      repo.findById.mockResolvedValue(role);

      const result = await service.findOne(1);

      expect(result).toEqual(role);
      expect(repo.findById).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if role does not exist", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a role", async () => {
      const role = createMockRole();
      const dto: UpdateUserRoleDto = { name: "superadmin" };
      const updated = createMockRole({ name: "superadmin" });

      repo.findById.mockResolvedValue(role);
      repo.findByName.mockResolvedValue(null);
      repo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result).toEqual(updated);
      expect(repo.save).toHaveBeenCalledWith({ ...role, ...dto });
    });

    it("should throw ConflictException if new name already exists", async () => {
      const role = createMockRole();
      const dto: UpdateUserRoleDto = { name: "manager" };
      const existing = createMockRole({ id: 2, name: "manager" });

      repo.findById.mockResolvedValue(role);
      repo.findByName.mockResolvedValue(existing);

      await expect(service.update(1, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("should delete a role", async () => {
      const role = createMockRole();
      repo.findById.mockResolvedValue(role);
      repo.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(repo.findById).toHaveBeenCalledWith(1);
      expect(repo.remove).toHaveBeenCalledWith(role);
    });

    it("should throw NotFoundException if role not found", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
