import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { RfqItem } from "./entities/rfq-item.entity";
import { RfqItemRepository } from "./rfq-item.repository";

@Injectable()
export class PostgresRfqItemRepository
  extends TypeOrmCrudRepository<RfqItem>
  implements RfqItemRepository
{
  constructor(@InjectRepository(RfqItem) repository: Repository<RfqItem>) {
    super(repository);
  }

  countByRfqId(rfqId: number): Promise<number> {
    return this.repository.count({ where: { rfq: { id: rfqId } } });
  }

  async deleteByRfqId(rfqId: number): Promise<void> {
    await this.repository.delete({ rfq: { id: rfqId } });
  }

  findByRfqIdOrderedByLineNumber(rfqId: number): Promise<RfqItem[]> {
    return this.repository.find({
      where: { rfq: { id: rfqId } },
      order: { lineNumber: "ASC" },
    });
  }

  findByRfqIdWithRelationsOrderedByLineNumber(
    rfqId: number,
    relations: string[],
  ): Promise<RfqItem[]> {
    return this.repository.find({
      where: { rfq: { id: rfqId } },
      relations,
      order: { lineNumber: "ASC" },
    });
  }
}
