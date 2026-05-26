import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { PositectorDevice } from "../entities/positector-device.entity";

export abstract class PositectorDeviceRepository extends CrudRepository<PositectorDevice> {
  abstract findByCompanyAndIp(
    companyId: number,
    ipAddress: string,
  ): Promise<PositectorDevice | null>;
  abstract findAllForCompany(
    companyId: number,
    activeFilter: boolean | undefined,
  ): Promise<PositectorDevice[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<PositectorDevice | null>;
  abstract updateById(id: number, updates: Partial<PositectorDevice>): Promise<void>;
}
