import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerOnboardingRepository } from "./customer-onboarding.repository";
import { CustomerOnboarding } from "./entities/customer-onboarding.entity";

@Injectable()
export class PostgresCustomerOnboardingRepository
  extends TypeOrmCrudRepository<CustomerOnboarding>
  implements CustomerOnboardingRepository
{
  constructor(@InjectRepository(CustomerOnboarding) repository: Repository<CustomerOnboarding>) {
    super(repository);
  }

  findByCustomerId(
    customerId: number,
    relations: string[] = [],
  ): Promise<CustomerOnboarding | null> {
    return this.repository.findOne({
      where: { customerId },
      ...(relations.length > 0 ? { relations } : {}),
    });
  }

  findPendingReview(statuses: string[]): Promise<CustomerOnboarding[]> {
    return this.repository.find({
      where: {
        status: In(statuses) as unknown as CustomerOnboarding["status"],
      },
      relations: ["customer", "customer.company", "customer.user"],
      order: { submittedAt: "ASC" },
    });
  }
}
