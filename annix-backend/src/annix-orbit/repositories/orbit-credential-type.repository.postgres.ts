import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { OrbitCredentialType } from "../entities/orbit-credential-type.entity";
import { OrbitCredentialTypeRepository } from "./orbit-credential-type.repository";

@Injectable()
export class PostgresOrbitCredentialTypeRepository
  extends TypeOrmCrudRepository<OrbitCredentialType>
  implements OrbitCredentialTypeRepository
{
  constructor(@InjectRepository(OrbitCredentialType) repository: Repository<OrbitCredentialType>) {
    super(repository);
  }

  listAllSorted(): Promise<OrbitCredentialType[]> {
    return this.repository.find({ order: { sortOrder: "ASC", label: "ASC" } });
  }

  listActiveSorted(): Promise<OrbitCredentialType[]> {
    return this.repository.find({
      where: { active: true },
      order: { sortOrder: "ASC", label: "ASC" },
    });
  }

  findByCode(code: string): Promise<OrbitCredentialType | null> {
    return this.repository.findOne({ where: { code } });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
