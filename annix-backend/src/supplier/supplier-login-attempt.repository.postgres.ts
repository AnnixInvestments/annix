import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SupplierLoginAttempt } from "./entities/supplier-login-attempt.entity";
import { SupplierLoginAttemptRepository } from "./supplier-login-attempt.repository";

@Injectable()
export class PostgresSupplierLoginAttemptRepository
  extends TypeOrmCrudRepository<SupplierLoginAttempt>
  implements SupplierLoginAttemptRepository
{
  constructor(
    @InjectRepository(SupplierLoginAttempt) repository: Repository<SupplierLoginAttempt>,
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
}
