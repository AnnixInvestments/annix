import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerPreferredSupplierRepository } from "./customer-preferred-supplier.repository";
import { CustomerPreferredSupplier } from "./entities/customer-preferred-supplier.entity";

@Injectable()
export class PostgresCustomerPreferredSupplierRepository
  extends TypeOrmCrudRepository<CustomerPreferredSupplier>
  implements CustomerPreferredSupplierRepository
{
  constructor(
    @InjectRepository(CustomerPreferredSupplier)
    repository: Repository<CustomerPreferredSupplier>,
  ) {
    super(repository);
  }

  findActiveByCompany(
    customerCompanyId: number,
    relations?: string[],
  ): Promise<CustomerPreferredSupplier[]> {
    return this.repository.find({
      where: { customerCompanyId, isActive: true },
      ...(relations && relations.length > 0 ? { relations } : {}),
      order: { priority: "ASC", createdAt: "DESC" },
    });
  }

  findActiveByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerPreferredSupplier | null> {
    return this.repository.findOne({
      where: { customerCompanyId, supplierProfileId, isActive: true },
    });
  }

  findByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerPreferredSupplier | null> {
    return this.repository.findOne({
      where: { customerCompanyId, supplierProfileId },
    });
  }

  findActiveByIdInCompany(
    id: number,
    customerCompanyId: number,
  ): Promise<CustomerPreferredSupplier | null> {
    return this.repository.findOne({
      where: { id, customerCompanyId, isActive: true },
    });
  }

  findByIdInCompany(
    id: number,
    customerCompanyId: number,
  ): Promise<CustomerPreferredSupplier | null> {
    return this.repository.findOne({
      where: { id, customerCompanyId },
    });
  }
}
