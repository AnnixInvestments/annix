import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { OrbitDismissReason } from "../entities/orbit-dismiss-reason.entity";
import { OrbitDismissReasonRepository } from "./orbit-dismiss-reason.repository";

@Injectable()
export class PostgresOrbitDismissReasonRepository
  extends TypeOrmCrudRepository<OrbitDismissReason>
  implements OrbitDismissReasonRepository
{
  constructor(@InjectRepository(OrbitDismissReason) repository: Repository<OrbitDismissReason>) {
    super(repository);
  }

  listAllSorted(): Promise<OrbitDismissReason[]> {
    return this.repository.find({ order: { sortOrder: "ASC", label: "ASC" } });
  }

  listActiveSorted(): Promise<OrbitDismissReason[]> {
    return this.repository.find({
      where: { active: true },
      order: { sortOrder: "ASC", label: "ASC" },
    });
  }

  findByCode(code: string): Promise<OrbitDismissReason | null> {
    return this.repository.findOne({ where: { code } });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
