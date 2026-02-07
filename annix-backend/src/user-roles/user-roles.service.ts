import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateUserRoleDto } from "./dto/create-user-role.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UserRole } from "./entities/user-role.entity";

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  async create(createUserRoleDto: CreateUserRoleDto): Promise<UserRole> {
    const existing = await this.userRoleRepo.findOne({
      where: { name: createUserRoleDto.name },
    });

    if (existing) {
      throw new ConflictException("Role already exists");
    }

    const role = this.userRoleRepo.create(createUserRoleDto);
    return this.userRoleRepo.save(role);
  }

  findAll() {
    return this.userRoleRepo.find();
  }

  async findOne(id: number): Promise<UserRole> {
    const role = await this.userRoleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: number, updateUserRoleDto: UpdateUserRoleDto): Promise<UserRole> {
    const role = await this.findOne(id);

    if (updateUserRoleDto.name) {
      const existing = await this.userRoleRepo.findOne({
        where: { name: updateUserRoleDto.name },
      });
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
