import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerDeviceBindingRepository } from "./customer-device-binding.repository";
import { CustomerDeviceBinding } from "./entities/customer-device-binding.entity";

@Injectable()
export class PostgresCustomerDeviceBindingRepository
  extends TypeOrmCrudRepository<CustomerDeviceBinding>
  implements CustomerDeviceBindingRepository
{
  constructor(
    @InjectRepository(CustomerDeviceBinding) repository: Repository<CustomerDeviceBinding>,
  ) {
    super(repository);
  }

  findActivePrimary(
    profileIdField: string,
    profileId: number,
    deviceFingerprint: string,
  ): Promise<CustomerDeviceBinding | null> {
    return this.repository.findOne({
      where: {
        [profileIdField]: profileId,
        deviceFingerprint,
        isActive: true,
        isPrimary: true,
      } as FindOptionsWhere<CustomerDeviceBinding>,
    });
  }
}
