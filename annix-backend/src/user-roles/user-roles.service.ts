import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserRoleDto } from "./dto/create-user-role.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UserRole } from "./entities/user-role.entity";
import { UserRoleRepository } from "./user-roles.repository";

@Injectable()
export class UserRolesService {
  constructor(private readonly userRoleRepo: UserRoleRepository) {}

  async create(createUserRoleDto: CreateUserRoleDto): Promise<UserRole> {
    const existing = await this.userRoleRepo.findByName(createUserRoleDto.name);

    if (existing) {
      throw new ConflictException("Role already exists");
    }

    return this.userRoleRepo.create(createUserRoleDto);
  }

  findAll() {
    return this.userRoleRepo.findAll();
  }

  async findOne(id: number): Promise<UserRole> {
    const role = await this.userRoleRepo.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: number, updateUserRoleDto: UpdateUserRoleDto): Promise<UserRole> {
    const role = await this.findOne(id);

    if (updateUserRoleDto.name) {
      const existing = await this.userRoleRepo.findByName(updateUserRoleDto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException("Role name already in use");
      }
    }

    Object.assign(role, updateUserRoleDto);
    return this.userRoleRepo.save(role);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    await this.userRoleRepo.remove(role);
  }
}
