import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  RubberDeliveryNote,
} from "../entities/rubber-delivery-note.entity";
import {
  type DeliveryNoteListFilters,
  type DeliveryNotePage,
  type DeliveryNotePageFilters,
  RubberDeliveryNoteRepository,
  type SupplierDnReconciliationRow,
} from "./rubber-delivery-note.repository";

@Injectable()
export class PostgresRubberDeliveryNoteRepository
  extends TypeOrmCrudRepository<RubberDeliveryNote>
  implements RubberDeliveryNoteRepository
{
  constructor(
    @InjectRepository(RubberDeliveryNote)
    repository: Repository<RubberDeliveryNote>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberDeliveryNote>): RubberDeliveryNote {
    return this.repository.create(data as TypeOrmDeepPartial<RubberDeliveryNote>);
  }

  saveMany(entities: RubberDeliveryNote[]): Promise<RubberDeliveryNote[]> {
    return this.repository.save(entities);
  }

  async updateById(id: number, updates: DeepPartial<RubberDeliveryNote>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<RubberDeliveryNote>);
  }

  async updatePendingToFailed(id: number): Promise<void> {
    await this.repository.update(
      { id, status: DeliveryNoteStatus.PENDING },
      { status: DeliveryNoteStatus.FAILED },
    );
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  findFiltered(filters?: DeliveryNoteListFilters): Promise<RubberDeliveryNote[]> {
    const query = this.repository
      .createQueryBuilder("dn")
      .leftJoinAndSelect("dn.supplierCompany", "company")
      .leftJoinAndSelect("dn.linkedCoc", "coc")
      .orderBy("dn.created_at", "DESC");

    if (!filters?.includeAllVersions) {
      query.andWhere("dn.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }

    if (filters?.deliveryNoteType) {
      query.andWhere("dn.delivery_note_type = :type", { type: filters.deliveryNoteType });
    }
    if (filters?.status) {
      query.andWhere("dn.status = :status", { status: filters.status });
    }
    if (filters?.supplierCompanyId) {
      query.andWhere("dn.supplier_company_id = :companyId", {
        companyId: filters.supplierCompanyId,
      });
    }
    if (filters?.companyType) {
      query.andWhere("company.company_type = :companyType", {
        companyType: filters.companyType,
      });
    }

    return query.getMany();
  }

  async findPaginated(
    filters: DeliveryNotePageFilters,
    sortColumnMap: Record<string, string>,
  ): Promise<DeliveryNotePage> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, filters.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const dnColumns = this.repository.metadata.columns
      .map((c) => c.propertyName)
      .filter((p) => p !== "extractedData")
      .map((p) => `dn.${p}`);

    const query = this.repository
      .createQueryBuilder("dn")
      .select(dnColumns)
      .leftJoin("dn.supplierCompany", "company")
      .addSelect(["company.id", "company.name", "company.companyType"])
      .leftJoin("dn.linkedCoc", "coc")
      .addSelect(["coc.id", "coc.cocNumber"]);

    if (!filters.includeAllVersions) {
      query.andWhere("dn.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }
    if (filters.deliveryNoteType) {
      query.andWhere("dn.delivery_note_type = :type", { type: filters.deliveryNoteType });
    }
    if (filters.status) {
      query.andWhere("dn.status = :status", { status: filters.status });
    }
    if (filters.supplierCompanyId) {
      query.andWhere("dn.supplier_company_id = :companyId", {
        companyId: filters.supplierCompanyId,
      });
    }
    if (filters.companyType) {
      query.andWhere("company.company_type = :companyType", {
        companyType: filters.companyType,
      });
    }
    if (filters.search) {
      query.andWhere(
        "(dn.delivery_note_number ILIKE :search OR dn.customer_reference ILIKE :search OR company.name ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    const sortKey = filters.sortColumn ?? "createdAt";
    const sortColumn = sortColumnMap[sortKey] ?? "dn.created_at";
    const sortDirection = filters.sortDirection === "asc" ? "ASC" : "DESC";
    query.orderBy(sortColumn, sortDirection, "NULLS LAST");
    query.addOrderBy("dn.id", "DESC");

    const total = await query.clone().getCount();

    query.offset(skip).limit(pageSize);
    const items = await query.getMany();
    return { items, total, page, pageSize };
  }

  async documentPathSiblingCounts(docPaths: string[]): Promise<Map<string, number>> {
    if (docPaths.length === 0) {
      return new Map();
    }
    const counts = await this.repository
      .createQueryBuilder("dn")
      .select("dn.document_path", "documentPath")
      .addSelect("COUNT(*)", "count")
      .where("dn.document_path IN (:...docPaths)", { docPaths })
      .andWhere("dn.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .groupBy("dn.document_path")
      .getRawMany<{ documentPath: string; count: string }>();
    return new Map(counts.map((c) => [c.documentPath, parseInt(c.count, 10)]));
  }

  findManyByIds(ids: number[]): Promise<RubberDeliveryNote[]> {
    return this.repository.find({
      where: { id: In(ids) },
    });
  }

  findByNumberAndCompany(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null> {
    return this.repository.findOne({
      where: { deliveryNoteNumber, supplierCompanyId },
      relations: ["supplierCompany", "linkedCoc"],
    });
  }

  findSiblingLinkedDeliveryNote(
    excludeId: number,
    supplierCompanyId: number,
    customerReference: string | null,
  ): Promise<RubberDeliveryNote | null> {
    return this.repository
      .createQueryBuilder("dn")
      .leftJoinAndSelect("dn.linkedCoc", "coc")
      .where("dn.linked_coc_id IS NOT NULL")
      .andWhere("dn.id != :id", { id: excludeId })
      .andWhere("dn.supplier_company_id = :supplierId", { supplierId: supplierCompanyId })
      .andWhere("dn.customer_reference = :custRef", { custRef: customerReference })
      .orderBy("dn.created_at", "DESC")
      .getOne();
  }

  findRollDeliveryNotesByCompanyIds(companyIds: number[]): Promise<RubberDeliveryNote[]> {
    return this.repository
      .createQueryBuilder("dn")
      .where("dn.supplier_company_id IN (:...customerIds)", { customerIds: companyIds })
      .andWhere("dn.delivery_note_type = :type", { type: DeliveryNoteType.ROLL })
      .getMany();
  }

  findUnlinkedBySupplierAndStatuses(
    supplierCompanyId: number,
    statuses: DeliveryNoteStatus[],
  ): Promise<RubberDeliveryNote[]> {
    return this.repository.find({
      where: statuses.map((status) => ({
        supplierCompanyId,
        linkedCocId: IsNull(),
        status,
      })),
    });
  }

  findAllUnlinked(): Promise<RubberDeliveryNote[]> {
    return this.repository.find({
      where: { linkedCocId: IsNull() },
    });
  }

  findLinkedSupplierDeliveryNotes(): Promise<RubberDeliveryNote[]> {
    return this.repository.find({
      where: {
        status: DeliveryNoteStatus.LINKED,
        linkedCocId: Not(IsNull()),
      },
    });
  }

  findAllWithCocLink(): Promise<RubberDeliveryNote[]> {
    return this.repository.find({
      where: {
        linkedCocId: Not(IsNull()),
      },
    });
  }

  findLinkedCustomerDnsNeedingStatusRepair(customerIds: number[]): Promise<RubberDeliveryNote[]> {
    return this.repository.find({
      where: customerIds.map((id) => ({
        supplierCompanyId: id,
        linkedCocId: Not(IsNull()),
        status: In([
          DeliveryNoteStatus.PENDING,
          DeliveryNoteStatus.EXTRACTED,
          DeliveryNoteStatus.STOCK_CREATED,
        ]),
      })),
    });
  }

  findUnlinkedRollDnsByCustomerIds(customerIds: number[]): Promise<RubberDeliveryNote[]> {
    return this.repository.find({
      where: customerIds.map((id) => ({
        supplierCompanyId: id,
        linkedCocId: IsNull(),
        deliveryNoteType: DeliveryNoteType.ROLL,
      })),
    });
  }

  findOneActiveByNumberAndSupplier(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null> {
    return this.repository
      .createQueryBuilder("dn")
      .where("LOWER(TRIM(dn.delivery_note_number)) = LOWER(TRIM(:deliveryNoteNumber))", {
        deliveryNoteNumber,
      })
      .andWhere("dn.supplier_company_id = :supplierCompanyId", { supplierCompanyId })
      .andWhere("dn.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .getOne();
  }

  findNewerVersionsByPreviousId(id: number): Promise<RubberDeliveryNote[]> {
    return this.repository
      .createQueryBuilder("e")
      .where("e.previous_version_id = :id", { id })
      .getMany();
  }

  async repointLinkedCocId(oldId: number, newId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ linkedCocId: newId })
      .where("linked_coc_id = :oldId", { oldId })
      .execute();
  }

  async findSupplierDnReconciliationRows(
    companyId: number,
  ): Promise<SupplierDnReconciliationRow[]> {
    const rows = await this.repository
      .createQueryBuilder("dn")
      .select("dn.id", "id")
      .addSelect("dn.delivery_note_number", "deliveryNoteNumber")
      .addSelect("dn.linked_coc_id", "linkedCocId")
      .addSelect("dn.version_status", "versionStatus")
      .where("dn.supplier_company_id = :companyId", { companyId })
      .andWhere("dn.version_status NOT IN (:...excluded)", {
        excluded: ["REJECTED", "SUPERSEDED"],
      })
      .orderBy("CASE WHEN dn.version_status = 'ACTIVE' THEN 0 ELSE 1 END", "ASC")
      .addOrderBy("dn.id", "DESC")
      .getRawMany();
    return rows.map((row) => ({
      id: Number(row.id),
      deliveryNoteNumber: row.deliveryNoteNumber == null ? null : String(row.deliveryNoteNumber),
      linkedCocId: row.linkedCocId == null ? null : Number(row.linkedCocId),
      versionStatus: String(row.versionStatus),
    }));
  }

  async findIdsWithRollsButNoItems(): Promise<number[]> {
    const rows = await this.repository.query<{ id: number }[]>(`
      SELECT dn.id
      FROM rubber_delivery_notes dn
      WHERE dn.extracted_data IS NOT NULL
        AND dn.extracted_data->'rolls' IS NOT NULL
        AND jsonb_array_length(dn.extracted_data->'rolls') > 0
        AND NOT EXISTS (
          SELECT 1 FROM rubber_delivery_note_items dni
          WHERE dni.delivery_note_id = dn.id
        )
      ORDER BY dn.id
    `);
    return rows.map((row) => Number(row.id));
  }
}
