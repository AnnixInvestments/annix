import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BoqLineItemRepository } from "./boq-line-item.repository";
import { BoqLineItem } from "./entities/boq-line-item.entity";

@Injectable()
export class PostgresBoqLineItemRepository
  extends TypeOrmCrudRepository<BoqLineItem>
  implements BoqLineItemRepository
{
  constructor(@InjectRepository(BoqLineItem) repository: Repository<BoqLineItem>) {
    super(repository);
  }

  async maxLineNumber(boqId: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder("item")
      .where("item.boq_id = :boqId", { boqId })
      .select("MAX(item.line_number)", "max")
      .getRawOne<{ max: number | null }>();
    return result?.max ?? 0;
  }

  findByBoq(boqId: number): Promise<BoqLineItem[]> {
    return this.repository.find({
      where: { boq: { id: boqId } },
      order: { lineNumber: "ASC" },
    });
  }

  findOneByBoq(lineItemId: number, boqId: number): Promise<BoqLineItem | null> {
    return this.repository.findOne({
      where: { id: lineItemId, boq: { id: boqId } },
    });
  }

  async reorderByIds(ids: number[]): Promise<void> {
    const lineNumberCases = ids.map((id, i) => `WHEN id = ${id} THEN ${i + 1}`).join(" ");
    await this.repository
      .createQueryBuilder()
      .update(BoqLineItem)
      .set({ lineNumber: () => `CASE ${lineNumberCases} END` })
      .whereInIds(ids)
      .execute();
  }
}
