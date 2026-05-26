import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerBlockedSupplierRepository } from "./customer-blocked-supplier.repository";
import { CustomerBlockedSupplier } from "./entities/customer-blocked-supplier.entity";

@Injectable()
export class PostgresCustomerBlockedSupplierRepository
  extends TypeOrmCrudRepository<CustomerBlockedSupplier>
  implements CustomerBlockedSupplierRepository
{
  constructor(
    @InjectRepository(CustomerBlockedSupplier)
    repository: Repository<CustomerBlockedSupplier>,
  ) {
    super(repository);
  }

  findActiveByCompany(customerCompanyId: number): Promise<CustomerBlockedSupplier[]> {
    return this.repository.find({
      where: { customerCompanyId, isActive: true },
    });
  }

  findActiveByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerBlockedSupplier | null> {
    return this.repository.findOne({
      where: { customerCompanyId, supplierProfileId, isActive: true },
    });
  }
}
