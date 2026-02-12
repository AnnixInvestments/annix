import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = this.userRepo.create({
      ...createUserDto,
      password: hashedPassword,
      salt: salt
    });

    let employeeRole = await this.userRoleRepo.findOne({ where: { name: 'employee' } });
    if (!employeeRole) {
      employeeRole = this.userRoleRepo.create({ name: 'employee' });
      await this.userRoleRepo.save(employeeRole);
    }

    user.roles = [employeeRole];

    const savedUser = this.userRepo.save(user);

    return plainToInstance(User, savedUser);
  }

  findAll() {
    return this.userRepo.find().then(users => users.map(user => plainToInstance(User, user)));
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return plainToInstance(User, user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const savedUser = this.userRepo.save(user);

    return plainToInstance(User, savedUser);
  }

  async remove(id: number) {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return { deleted: true };
  }
}
