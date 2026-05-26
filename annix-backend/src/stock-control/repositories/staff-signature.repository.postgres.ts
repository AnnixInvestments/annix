import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StaffSignature } from "../entities/staff-signature.entity";
import { StaffSignatureRepository } from "./staff-signature.repository";

@Injectable()
export class PostgresStaffSignatureRepository
  extends TypeOrmCrudRepository<StaffSignature>
  implements StaffSignatureRepository
{
  constructor(@InjectRepository(StaffSignature) repository: Repository<StaffSignature>) {
    super(repository);
  }

  findByUser(userId: number): Promise<StaffSignature | null> {
    return this.repository.findOne({
      where: { userId },
    });
  }
}
