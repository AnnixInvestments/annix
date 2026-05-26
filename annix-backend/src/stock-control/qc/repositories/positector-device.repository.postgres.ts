import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { PositectorDevice } from "../entities/positector-device.entity";
import { PositectorDeviceRepository } from "./positector-device.repository";

@Injectable()
export class PostgresPositectorDeviceRepository
  extends TypeOrmCrudRepository<PositectorDevice>
  implements PositectorDeviceRepository
{
  constructor(@InjectRepository(PositectorDevice) repository: Repository<PositectorDevice>) {
    super(repository);
  }

  findByCompanyAndIp(companyId: number, ipAddress: string): Promise<PositectorDevice | null> {
    return this.repository.findOne({
      where: { companyId, ipAddress },
    });
  }

  findAllForCompany(
    companyId: number,
    activeFilter: boolean | undefined,
  ): Promise<PositectorDevice[]> {
    const qb = this.repository
      .createQueryBuilder("d")
      .where("d.companyId = :companyId", { companyId })
      .orderBy("d.deviceName", "ASC");

    if (activeFilter !== undefined) {
      qb.andWhere("d.isActive = :active", { active: activeFilter });
    }

    return qb.getMany();
  }

  findByIdForCompany(companyId: number, id: number): Promise<PositectorDevice | null> {
    return this.repository.findOne({
      where: { id, companyId },
    });
  }

  async updateById(id: number, updates: Partial<PositectorDevice>): Promise<void> {
    await this.repository.update({ id }, updates);
  }
}
