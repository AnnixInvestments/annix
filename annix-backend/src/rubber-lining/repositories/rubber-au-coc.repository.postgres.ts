import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AuCocStatus, RubberAuCoc } from "../entities/rubber-au-coc.entity";
import {
  type AuCocDeliveryNoteRef,
  type AuCocListFilters,
  type AuCocWithItemCount,
  RubberAuCocRepository,
} from "./rubber-au-coc.repository";

@Injectable()
export class PostgresRubberAuCocRepository
  extends TypeOrmCrudRepository<RubberAuCoc>
  implements RubberAuCocRepository
{
  constructor(@InjectRepository(RubberAuCoc) repository: Repository<RubberAuCoc>) {
    super(repository);
  }

  build(data: Partial<RubberAuCoc>): RubberAuCoc {
    return this.repository.create(data as TypeOrmDeepPartial<RubberAuCoc>);
  }

  saveMany(entities: RubberAuCoc[]): Promise<RubberAuCoc[]> {
    return this.repository.save(entities);
  }

  async updateById(id: number, updates: DeepPartial<RubberAuCoc>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<RubberAuCoc>);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  async findWithItemCounts(filters?: AuCocListFilters): Promise<AuCocWithItemCount[]> {
    const query = this.repository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.customerCompany", "customer")
      .addSelect(
        (sub) =>
          sub
            .select("COUNT(item.id)")
            .from("rubber_au_coc_items", "item")
            .where("item.au_coc_id = coc.id"),
        "item_count",
      )
      .orderBy("coc.created_at", "DESC");

    if (filters?.status) {
      query.andWhere("coc.status = :status", { status: filters.status });
    }
    if (filters?.customerCompanyId) {
      query.andWhere("coc.customer_company_id = :companyId", {
        companyId: filters.customerCompanyId,
      });
    }

    const rawResults = await query.getRawAndEntities();
    return rawResults.entities.map((coc, idx) => ({
      coc,
      linkedItemCount: parseInt(rawResults.raw[idx]?.item_count || "0", 10),
    }));
  }

  findByStatusesOrderedById(statuses: AuCocStatus[]): Promise<RubberAuCoc[]> {
    return this.repository.find({
      where: statuses.map((status) => ({ status })),
      order: { id: "ASC" },
    });
  }

  findByIdsOrderedById(ids: number[]): Promise<RubberAuCoc[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: { id: In(ids) },
      order: { id: "ASC" },
    });
  }

  findByIdsWithCustomerOrderedById(ids: number[]): Promise<RubberAuCoc[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: { id: In(ids) },
      relations: ["customerCompany"],
      order: { id: "ASC" },
    });
  }

  findByStatusWithCustomerOrderedByCocNumber(status: AuCocStatus): Promise<RubberAuCoc[]> {
    return this.repository.find({
      where: { status },
      relations: ["customerCompany"],
      order: { cocNumber: "ASC" },
    });
  }

  findByStatus(status: AuCocStatus): Promise<RubberAuCoc[]> {
    return this.repository.find({
      where: { status },
    });
  }

  async findRefsByDeliveryNoteIds(dnIds: number[]): Promise<AuCocDeliveryNoteRef[]> {
    const auCocs = await this.repository
      .createQueryBuilder("ac")
      .select(["ac.id", "ac.cocNumber", "ac.sourceDeliveryNoteId"])
      .where("ac.source_delivery_note_id IN (:...dnIds)", { dnIds })
      .getMany();
    return auCocs.map((ac) => ({
      id: ac.id,
      cocNumber: ac.cocNumber,
      sourceDeliveryNoteId: ac.sourceDeliveryNoteId,
    }));
  }

  async nextCocSequence(): Promise<number> {
    const result = await this.repository.query(`SELECT nextval('rubber_au_coc_number_seq') as seq`);
    return result[0]?.seq || 1;
  }
}
