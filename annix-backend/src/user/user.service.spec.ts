import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { UserRole } from "../../src/user-roles/entities/user-role.entity";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { User } from "./entities/user.entity";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";

const mockUserRepo = {
  instantiate: jest.fn(),
  save: jest.fn(),
  findAllWithRoles: jest.fn(),
  findByIdWithRoles: jest.fn(),
  deleteById: jest.fn(),
};

const mockUserRoleRepo = {
  findByName: jest.fn(),
  create: jest.fn(),
};

jest.mock("bcrypt", () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

describe("UserService", () => {
  let service: UserService;
  let userRepo: jest.Mocked<UserRepository>;
  let roleRepo: jest.Mocked<UserRoleRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: UserRoleRepository, useValue: mockUserRoleRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(UserRepository);
    roleRepo = module.get(UserRoleRepository);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create and return a user", async () => {
      const dto = {
        username: "john",
        email: "john@example.com",
        password: "123456",
      };
      const hashedPassword = "hashed_pass";

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const role = { id: 1, name: "employee" } as UserRole;
      roleRepo.findByName.mockResolvedValue(role);

      const createdUser = {
        username: dto.username,
        email: dto.email,
        passwordHash: hashedPassword,
        roles: [role],
      } as User;
      userRepo.instantiate.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue({ ...createdUser, id: 1 });

      const result = await service.create(dto);

      expect(userRepo.instantiate).toHaveBeenCalledWith({
        ...dto,
        passwordHash: hashedPassword,
      });
      expect(userRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 1,
        username: "john",
        email: "john@example.com",
      });
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      const users = [{ id: 1, username: "john", email: "john@example.com" }] as User[];
      userRepo.findAllWithRoles.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(userRepo.findAllWithRoles).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a user by ID", async () => {
      const user = { id: 1, username: "john" } as User;
      userRepo.findByIdWithRoles.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(result).toEqual(user);
      expect(userRepo.findByIdWithRoles).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if user does not exist", async () => {
      userRepo.findByIdWithRoles.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update and return a user", async () => {
      const user = { id: 1, username: "john", passwordHash: "old" } as User;
      jest.spyOn(service, "findOne").mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, username: "john_updated" });

      const result = await service.update(1, { username: "john_updated" });

      expect(result.username).toBe("john_updated");
      expect(userRepo.save).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should delete a user", async () => {
      userRepo.deleteById.mockResolvedValue(1);

      const result = await service.remove(1);

      expect(result).toEqual({ deleted: true });
      expect(userRepo.deleteById).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if user not found", async () => {
      userRepo.deleteById.mockResolvedValue(0);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
