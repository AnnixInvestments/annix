import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from './entities/user-role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async create(createUserRoleDto: CreateUserRoleDto): Promise<UserRole> {
    const existing = await this.userRoleRepository.findOne({
      where: { name: createUserRoleDto.name },
    });

    if (existing) {
      throw new ConflictException('Role already exists');
    }

    const role = this.userRoleRepository.create(createUserRoleDto);
    return this.userRoleRepository.save(role);  }

  findAll() {
    return this.userRoleRepository.find();
  }

  async findOne(id: number): Promise<UserRole> {
    const role = await this.userRoleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: number, updateUserRoleDto: UpdateUserRoleDto): Promise<UserRole> {
    const role = await this.findOne(id);

    if (updateUserRoleDto.name) {
      const existing = await this.userRoleRepository.findOne({
        where: { name: updateUserRoleDto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Role name already in use');
      }
    }

    Object.assign(role, updateUserRoleDto);
    return this.userRoleRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    await this.userRoleRepository.remove(role);
  }
}
