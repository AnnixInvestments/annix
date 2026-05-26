import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { RfqClarificationRequest } from "./entities/rfq-clarification-request.entity";
import { RfqClarificationRequestRepository } from "./rfq-clarification-request.repository";

@Injectable()
export class PostgresRfqClarificationRequestRepository
  extends TypeOrmCrudRepository<RfqClarificationRequest>
  implements RfqClarificationRequestRepository
{
  constructor(
    @InjectRepository(RfqClarificationRequest) repository: Repository<RfqClarificationRequest>,
  ) {
    super(repository);
  }

  findByToken(token: string): Promise<RfqClarificationRequest | null> {
    return this.repository.findOne({ where: { token } });
  }
}
