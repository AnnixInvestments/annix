import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitUser } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitUserRepository } from "./annix-orbit-user.repository";

@Injectable()
export class PostgresAnnixOrbitUserRepository
  extends TypeOrmCrudRepository<AnnixOrbitUser>
  implements AnnixOrbitUserRepository
{
  constructor(@InjectRepository(AnnixOrbitUser) repository: Repository<AnnixOrbitUser>) {
    super(repository);
  }

  async updatePreferences(id: number, updates: Partial<AnnixOrbitUser>): Promise<void> {
    await this.repository.update(id, updates);
  }

  findAllOrderedById(): Promise<AnnixOrbitUser[]> {
    return this.repository.find({ order: { id: "ASC" } });
  }
}
