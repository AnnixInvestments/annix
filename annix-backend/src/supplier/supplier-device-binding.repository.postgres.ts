import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SupplierDeviceBinding } from "./entities/supplier-device-binding.entity";
import { SupplierDeviceBindingRepository } from "./supplier-device-binding.repository";

@Injectable()
export class PostgresSupplierDeviceBindingRepository
  extends TypeOrmCrudRepository<SupplierDeviceBinding>
  implements SupplierDeviceBindingRepository
{
  constructor(
    @InjectRepository(SupplierDeviceBinding) repository: Repository<SupplierDeviceBinding>,
  ) {
    super(repository);
  }

  findActivePrimary(
    profileIdField: string,
    profileId: number,
    deviceFingerprint: string,
  ): Promise<SupplierDeviceBinding | null> {
    return this.repository.findOne({
      where: {
        [profileIdField]: profileId,
        deviceFingerprint,
        isActive: true,
        isPrimary: true,
      } as FindOptionsWhere<SupplierDeviceBinding>,
    });
  }
}
