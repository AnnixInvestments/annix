import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { OrbitTierCapability } from "../entities/orbit-tier-capability.entity";
import { OrbitTierCapabilityRepository } from "./orbit-tier-capability.repository";

@Injectable()
export class PostgresOrbitTierCapabilityRepository
  extends TypeOrmCrudRepository<OrbitTierCapability>
  implements OrbitTierCapabilityRepository
{
  constructor(@InjectRepository(OrbitTierCapability) repository: Repository<OrbitTierCapability>) {
    super(repository);
  }

  async findAllOrdered(): Promise<OrbitTierCapability[]> {
    return this.repository.find({ order: { displayOrder: "ASC", tier: "ASC" } });
  }

  async findByTier(tier: string): Promise<OrbitTierCapability | null> {
    return this.repository.findOne({ where: { tier } });
  }
}
