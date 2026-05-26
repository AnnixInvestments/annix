import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { UserRole } from "./entities/user-role.entity";
import { UserRoleRepository } from "./user-roles.repository";

@Injectable()
export class PostgresUserRoleRepository
  extends TypeOrmCrudRepository<UserRole>
  implements UserRoleRepository
{
  constructor(@InjectRepository(UserRole) repository: Repository<UserRole>) {
    super(repository);
  }

  findByName(name: string): Promise<UserRole | null> {
    return this.repository.findOne({ where: { name } });
  }
}
