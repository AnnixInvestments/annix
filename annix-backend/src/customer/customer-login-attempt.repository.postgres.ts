import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerLoginAttemptRepository } from "./customer-login-attempt.repository";
import { CustomerLoginAttempt } from "./entities/customer-login-attempt.entity";

@Injectable()
export class PostgresCustomerLoginAttemptRepository
  extends TypeOrmCrudRepository<CustomerLoginAttempt>
  implements CustomerLoginAttemptRepository
{
  constructor(
    @InjectRepository(CustomerLoginAttempt) repository: Repository<CustomerLoginAttempt>,
  ) {
    super(repository);
  }

  countRecentFailures(email: string, since: Date): Promise<number> {
    return this.repository.count({
      where: {
        email,
        success: false,
        attemptTime: MoreThanOrEqual(since),
      },
    });
  }

  recentByProfile(customerProfileId: number, limit: number): Promise<CustomerLoginAttempt[]> {
    return this.repository.find({
      where: { customerProfileId },
      order: { attemptTime: "DESC" },
      take: limit,
    });
  }
}
