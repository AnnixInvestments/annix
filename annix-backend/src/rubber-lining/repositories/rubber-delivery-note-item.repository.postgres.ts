import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberDeliveryNoteItem } from "../entities/rubber-delivery-note-item.entity";
import {
  type DeliveryNoteRollNumberRow,
  RubberDeliveryNoteItemRepository,
  type SourceSupplierCocRow,
} from "./rubber-delivery-note-item.repository";

@Injectable()
export class PostgresRubberDeliveryNoteItemRepository
  extends TypeOrmCrudRepository<RubberDeliveryNoteItem>
  implements RubberDeliveryNoteItemRepository
{
  constructor(
    @InjectRepository(RubberDeliveryNoteItem)
    repository: Repository<RubberDeliveryNoteItem>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberDeliveryNoteItem>): RubberDeliveryNoteItem {
    return this.repository.create(data as TypeOrmDeepPartial<RubberDeliveryNoteItem>);
  }

  saveMany(entities: RubberDeliveryNoteItem[]): Promise<RubberDeliveryNoteItem[]> {
    return this.repository.save(entities);
  }

  async removeMany(entities: RubberDeliveryNoteItem[]): Promise<void> {
    if (entities.length === 0) return;
    await this.repository.remove(entities);
  }

  findByDeliveryNoteId(deliveryNoteId: number): Promise<RubberDeliveryNoteItem[]> {
    return this.repository.find({
      where: { deliveryNoteId },
    });
  }

  findByDeliveryNoteIdOrderedById(deliveryNoteId: number): Promise<RubberDeliveryNoteItem[]> {
    return this.repository.find({
      where: { deliveryNoteId },
      order: { id: "ASC" },
    });
  }

  async deleteByDeliveryNoteId(deliveryNoteId: number): Promise<void> {
    await this.repository.delete({ deliveryNoteId });
  }

  async findRollNumbersByDeliveryNoteIds(noteIds: number[]): Promise<DeliveryNoteRollNumberRow[]> {
    if (noteIds.length === 0) return [];
    const rows = await this.repository
      .createQueryBuilder("dni")
      .select("dni.delivery_note_id", "deliveryNoteId")
      .addSelect("dni.roll_number", "rollNumber")
      .where("dni.delivery_note_id IN (:...ids)", { ids: noteIds })
      .andWhere("dni.roll_number IS NOT NULL")
      .orderBy("dni.id", "ASC")
      .getRawMany<{ deliveryNoteId: number; rollNumber: string }>();
    return rows.map((row) => ({
      deliveryNoteId: Number(row.deliveryNoteId),
      rollNumber: String(row.rollNumber),
    }));
  }

  async sourceSupplierCocsForCustomerDn(deliveryNoteId: number): Promise<SourceSupplierCocRow[]> {
    const rows = await this.repository.query(
      `
      SELECT coc.id AS id,
             coc.coc_number AS coc_number,
             coc.supplier_company_id AS supplier_company_id,
             comp.name AS supplier_name,
             COUNT(DISTINCT rs.id) AS roll_count
      FROM rubber_delivery_note_items dni
      JOIN rubber_roll_stock rs
        ON rs.roll_number = dni.roll_number
       AND rs.customer_delivery_note_id = dni.delivery_note_id
      JOIN rubber_delivery_notes sdn
        ON sdn.id = rs.supplier_delivery_note_id
      JOIN rubber_supplier_cocs coc
        ON coc.id = sdn.linked_coc_id
      LEFT JOIN rubber_company comp
        ON comp.id = coc.supplier_company_id
      WHERE dni.delivery_note_id = $1
        AND coc.version_status NOT IN ('REJECTED','SUPERSEDED')
      GROUP BY coc.id, coc.coc_number, coc.supplier_company_id, comp.name
      ORDER BY roll_count DESC, coc.coc_number ASC
      `,
      [deliveryNoteId],
    );
    return rows.map((row: Record<string, unknown>) => ({
      id: Number(row.id),
      cocNumber: row.coc_number == null ? null : String(row.coc_number),
      supplierCompanyId: row.supplier_company_id == null ? null : Number(row.supplier_company_id),
      supplierCompanyName: row.supplier_name == null ? null : String(row.supplier_name),
      rollCount: Number(row.roll_count),
    }));
  }
}
