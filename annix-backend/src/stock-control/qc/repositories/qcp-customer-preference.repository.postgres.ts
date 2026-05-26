import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { QcpCustomerPreference } from "../entities/qcp-customer-preference.entity";
import { QcpCustomerPreferenceRepository } from "./qcp-customer-preference.repository";

@Injectable()
export class PostgresQcpCustomerPreferenceRepository
  extends TypeOrmCrudRepository<QcpCustomerPreference>
  implements QcpCustomerPreferenceRepository
{
  constructor(
    @InjectRepository(QcpCustomerPreference) repository: Repository<QcpCustomerPreference>,
  ) {
    super(repository);
  }

  findByCompanyCustomerAndType(
    companyId: number,
    customerName: string,
    planType: string,
  ): Promise<QcpCustomerPreference | null> {
    return this.repository.findOne({
      where: { companyId, customerName, planType },
    });
  }

  findByCompanyAndCustomer(
    companyId: number,
    customerName: string,
  ): Promise<QcpCustomerPreference | null> {
    return this.repository.findOne({
      where: { companyId, customerName },
    });
  }

  findForCompanyCustomer(
    companyId: number,
    customerName: string,
    planType: string | undefined,
  ): Promise<QcpCustomerPreference[]> {
    return this.repository.find({
      where: planType ? { companyId, customerName, planType } : { companyId, customerName },
    });
  }

  async updateById(id: number, updates: Partial<QcpCustomerPreference>): Promise<void> {
    await this.repository.update(id, updates);
  }
}
