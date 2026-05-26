import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  SupplierOnboarding,
  SupplierOnboardingStatus,
} from "./entities/supplier-onboarding.entity";
import { SupplierOnboardingRepository } from "./supplier-onboarding.repository";

@Injectable()
export class PostgresSupplierOnboardingRepository
  extends TypeOrmCrudRepository<SupplierOnboarding>
  implements SupplierOnboardingRepository
{
  constructor(@InjectRepository(SupplierOnboarding) repository: Repository<SupplierOnboarding>) {
    super(repository);
  }

  findBySupplierId(supplierId: number): Promise<SupplierOnboarding | null> {
    return this.repository.findOne({ where: { supplierId } });
  }

  findBySupplierIdWithRelations(
    supplierId: number,
    relations: string[],
  ): Promise<SupplierOnboarding | null> {
    return this.repository.findOne({ where: { supplierId }, relations });
  }

  async updateDocumentsStatus(supplierId: number, documentsComplete: boolean): Promise<void> {
    await this.repository.update({ supplierId }, { documentsComplete });
  }

  findApprovedWithSupplier(): Promise<SupplierOnboarding[]> {
    return this.repository.find({
      where: { status: SupplierOnboardingStatus.APPROVED },
      relations: ["supplier"],
    });
  }
}
