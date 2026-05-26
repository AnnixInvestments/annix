import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { plainToInstance } from "class-transformer";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";
import { UserRepository } from "./user.repository";

@Injectable()
export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly userRoleRepo: UserRoleRepository,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepo.instantiate({
      ...createUserDto,
      passwordHash: hashedPassword,
    });

    let employeeRole = await this.userRoleRepo.findByName("employee");
    if (!employeeRole) {
      employeeRole = await this.userRoleRepo.create({ name: "employee" });
    }

    user.roles = [employeeRole];

    const savedUser = this.userRepo.save(user);

    return plainToInstance(User, savedUser);
  }

  findAll() {
    return this.userRepo
      .findAllWithRoles()
      .then((users) => users.map((user) => plainToInstance(User, user)));
  }

  async findOne(id: number) {
    const user = await this.userRepo.findByIdWithRoles(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return plainToInstance(User, user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    const savedUser = this.userRepo.save(user);

    return plainToInstance(User, savedUser);
  }

  async remove(id: number) {
    const affected = await this.userRepo.deleteById(id);
    if (affected === 0) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return { deleted: true };
  }
}
