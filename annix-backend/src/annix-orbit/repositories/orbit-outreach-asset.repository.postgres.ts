import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { OrbitOutreachAsset } from "../entities/orbit-outreach-asset.entity";
import { OrbitOutreachAssetRepository } from "./orbit-outreach-asset.repository";

@Injectable()
export class PostgresOrbitOutreachAssetRepository
  extends TypeOrmCrudRepository<OrbitOutreachAsset>
  implements OrbitOutreachAssetRepository
{
  constructor(@InjectRepository(OrbitOutreachAsset) repository: Repository<OrbitOutreachAsset>) {
    super(repository);
  }

  findBySlot(slot: string): Promise<OrbitOutreachAsset | null> {
    return this.repository.findOne({ where: { slot } });
  }

  listAll(): Promise<OrbitOutreachAsset[]> {
    return this.repository.find({ order: { createdAt: "ASC" } });
  }
}
