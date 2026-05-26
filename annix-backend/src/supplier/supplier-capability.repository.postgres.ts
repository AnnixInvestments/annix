import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SupplierCapability } from "./entities/supplier-capability.entity";
import { SupplierCapabilityRepository } from "./supplier-capability.repository";

@Injectable()
export class PostgresSupplierCapabilityRepository
  extends TypeOrmCrudRepository<SupplierCapability>
  implements SupplierCapabilityRepository
{
  constructor(@InjectRepository(SupplierCapability) repository: Repository<SupplierCapability>) {
    super(repository);
  }

  findActiveBySupplierIdsWithRelations(
    supplierProfileIds: number[],
  ): Promise<SupplierCapability[]> {
    if (supplierProfileIds.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: {
        supplierProfileId: In(supplierProfileIds),
        isActive: true,
      },
      relations: ["supplierProfile", "supplierProfile.user", "supplierProfile.company"],
    });
  }
}
