import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Territory } from "./entities/territory.entity";
import { TerritoryRepository } from "./territory.repository";

@Injectable()
export class PostgresTerritoryRepository
  extends TypeOrmCrudRepository<Territory>
  implements TerritoryRepository
{
  constructor(@InjectRepository(Territory) repository: Repository<Territory>) {
    super(repository);
  }

  findByOrganization(organizationId: number): Promise<Territory[]> {
    return this.repository.find({
      where: { organizationId },
      relations: ["assignedTo"],
      order: { name: "ASC" },
    });
  }

  findByIdWithRelations(id: number): Promise<Territory | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["assignedTo", "organization"],
    });
  }

  findActiveByOrganization(organizationId: number): Promise<Territory[]> {
    return this.repository.find({
      where: { organizationId, isActive: true },
    });
  }

  findActiveByAssignedUser(userId: number): Promise<Territory[]> {
    return this.repository.find({
      where: { assignedToId: userId, isActive: true },
      order: { name: "ASC" },
    });
  }

  findByOrganizationWithAssignedTo(organizationId: number): Promise<Territory[]> {
    return this.repository.find({
      where: { organizationId },
      relations: ["assignedTo"],
    });
  }
}
