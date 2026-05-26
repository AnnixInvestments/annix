import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { UserLocationAssignment } from "../entities/user-location-assignment.entity";
import { UserLocationAssignmentRepository } from "./user-location-assignment.repository";

@Injectable()
export class PostgresUserLocationAssignmentRepository
  extends TypeOrmCrudRepository<UserLocationAssignment>
  implements UserLocationAssignmentRepository
{
  constructor(
    @InjectRepository(UserLocationAssignment) repository: Repository<UserLocationAssignment>,
  ) {
    super(repository);
  }

  buildMany(rows: DeepPartial<UserLocationAssignment>[]): UserLocationAssignment[] {
    return this.repository.create(rows as TypeOrmDeepPartial<UserLocationAssignment>[]);
  }

  saveMany(entities: UserLocationAssignment[]): Promise<UserLocationAssignment[]> {
    return this.repository.save(entities);
  }

  findForCompanyWithRelations(companyId: number): Promise<UserLocationAssignment[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["user", "location"],
      order: { userId: "ASC" },
    });
  }

  findForUser(companyId: number, userId: number): Promise<UserLocationAssignment[]> {
    return this.repository.find({
      where: { companyId, userId },
      select: ["locationId"],
    });
  }

  async deleteForUser(companyId: number, userId: number): Promise<void> {
    await this.repository.delete({ companyId, userId });
  }
}
