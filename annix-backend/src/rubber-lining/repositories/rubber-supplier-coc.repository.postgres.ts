import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import {
  CocProcessingStatus,
  RubberSupplierCoc,
  SupplierCocType,
} from "../entities/rubber-supplier-coc.entity";
import {
  RubberSupplierCocRepository,
  type SupplierCocExportFilters,
  type SupplierCocListFilters,
} from "./rubber-supplier-coc.repository";

@Injectable()
export class PostgresRubberSupplierCocRepository
  extends TypeOrmCrudRepository<RubberSupplierCoc>
  implements RubberSupplierCocRepository
{
  constructor(@InjectRepository(RubberSupplierCoc) repository: Repository<RubberSupplierCoc>) {
    super(repository);
  }

  build(data: Partial<RubberSupplierCoc>): RubberSupplierCoc {
    return this.repository.create(data as TypeOrmDeepPartial<RubberSupplierCoc>);
  }

  saveMany(entities: RubberSupplierCoc[]): Promise<RubberSupplierCoc[]> {
    return this.repository.save(entities);
  }

  async updateById(id: number, updates: DeepPartial<RubberSupplierCoc>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<RubberSupplierCoc>);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  findByCocTypeSelectingIdentity(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    return this.repository.find({
      where: { cocType },
      select: ["id", "compoundCode", "documentPath"],
    });
  }

  async findIdsMissingCocNumber(): Promise<number[]> {
    const cocs = await this.repository
      .createQueryBuilder("coc")
      .select(["coc.id"])
      .where("(coc.coc_number IS NULL OR coc.coc_number = '')")
      .andWhere("coc.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .andWhere("coc.document_path IS NOT NULL")
      .orderBy("coc.id", "DESC")
      .getMany();
    return cocs.map((c) => c.id);
  }

  findForListing(filters?: SupplierCocListFilters): Promise<RubberSupplierCoc[]> {
    const cocColumns = this.repository.metadata.columns
      .map((c) => c.propertyName)
      .filter((p) => p !== "extractedData" && p !== "reviewNotes")
      .map((p) => `coc.${p}`);

    const query = this.repository
      .createQueryBuilder("coc")
      .select(cocColumns)
      .leftJoin("coc.supplierCompany", "company")
      .addSelect(["company.id", "company.name"])
      .orderBy("coc.created_at", "DESC");

    if (filters?.versionStatus) {
      query.andWhere("coc.version_status = :versionStatus", {
        versionStatus: filters.versionStatus,
      });
    } else if (!filters?.includeAllVersions) {
      query.andWhere("coc.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }

    if (filters?.cocType) {
      query.andWhere("coc.coc_type = :cocType", { cocType: filters.cocType });
    }
    if (filters?.processingStatus) {
      query.andWhere("coc.processing_status = :status", { status: filters.processingStatus });
    }
    if (filters?.supplierCompanyId) {
      query.andWhere("coc.supplier_company_id = :companyId", {
        companyId: filters.supplierCompanyId,
      });
    }

    return query.getMany();
  }

  findPendingAuthorizationWithCompany(): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.version_status = :status", {
        status: DocumentVersionStatus.PENDING_AUTHORIZATION,
      })
      .orderBy("coc.created_at", "DESC")
      .getMany();
  }

  findByIdWithCompany(id: number): Promise<RubberSupplierCoc | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["supplierCompany"],
    });
  }

  findSiblingsByDocumentPathExcludingId(
    documentPath: string,
    id: number,
  ): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.document_path = :documentPath", { documentPath })
      .andWhere("coc.id <> :id", { id })
      .orderBy("coc.id", "ASC")
      .getMany();
  }

  findOneByDocumentHash(documentHash: string): Promise<RubberSupplierCoc | null> {
    return this.repository.findOne({ where: { documentHash } });
  }

  findMissingDocumentHash(): Promise<RubberSupplierCoc[]> {
    return this.repository.find({
      where: { documentHash: IsNull() },
      select: ["id", "documentPath"],
    });
  }

  async markExtractionFailedIfPending(id: number): Promise<void> {
    await this.repository.update(
      { id, processingStatus: CocProcessingStatus.PENDING },
      { processingStatus: CocProcessingStatus.FAILED },
    );
  }

  findCalenderRollSiblingsByDocumentPath(
    documentPath: string | null,
  ): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.document_path = :documentPath", { documentPath })
      .andWhere("coc.coc_type = :cocType", { cocType: SupplierCocType.CALENDER_ROLL })
      .orderBy("coc.id", "ASC")
      .getMany();
  }

  findActiveWithCocNumber(): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .andWhere("coc.coc_number IS NOT NULL")
      .andWhere("coc.coc_number <> ''")
      .orderBy("coc.id", "ASC")
      .getMany();
  }

  async deleteAllAndResetSequence(): Promise<number> {
    const cocResult = await this.repository.createQueryBuilder().delete().execute();
    await this.repository.query("ALTER SEQUENCE rubber_supplier_cocs_id_seq RESTART WITH 1");
    return cocResult.affected || 0;
  }

  countByVersionStatus(versionStatus: DocumentVersionStatus): Promise<number> {
    return this.repository.count({ where: { versionStatus } });
  }

  findByCocType(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: cocType })
      .getMany();
  }

  findByCocTypeWithCompany(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.coc_type = :type", { type: cocType })
      .getMany();
  }

  findActiveByCocType(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: cocType })
      .andWhere("coc.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .getMany();
  }

  findCompoundersByCompoundCodes(codes: string[]): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .andWhere("coc.compound_code IN (:...codes)", { codes })
      .orderBy("coc.id", "DESC")
      .getMany();
  }

  findOneCalenderRollByOrderNumber(orderNumber: string): Promise<RubberSupplierCoc | null> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .andWhere("coc.order_number = :orderNumber", { orderNumber })
      .orderBy("coc.id", "DESC")
      .getOne();
  }

  findOneByCocTypeAndOrderNumberLatest(
    cocType: SupplierCocType,
    orderNumber: string,
  ): Promise<RubberSupplierCoc | null> {
    return this.repository.findOne({
      where: { cocType, orderNumber },
      order: { id: "DESC" },
    });
  }

  findByIds(ids: number[]): Promise<RubberSupplierCoc[]> {
    return this.repository.find({ where: { id: In(ids) } });
  }

  findByIdsWithCompany(ids: number[]): Promise<RubberSupplierCoc[]> {
    return this.repository.find({
      where: { id: In(ids) },
      relations: ["supplierCompany"],
    });
  }

  findIdAndCocNumberByIds(ids: number[]): Promise<RubberSupplierCoc[]> {
    return this.repository.find({
      where: { id: In(ids) },
      select: ["id", "cocNumber"],
    });
  }

  findExportable(filters: SupplierCocExportFilters): Promise<RubberSupplierCoc[]> {
    const qb = this.repository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.processing_status IN (:...statuses)", {
        statuses: [CocProcessingStatus.EXTRACTED, CocProcessingStatus.APPROVED],
      });

    if (filters.dateFrom) {
      qb.andWhere("coc.created_at >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere("coc.created_at <= :dateTo", { dateTo: filters.dateTo });
    }

    if (filters.excludeExported) {
      qb.andWhere("coc.exported_to_sage_at IS NULL");
    }

    qb.orderBy("coc.created_at", "ASC");

    return qb.getMany();
  }

  async markExportedByIds(ids: number[], exportedAt: Date): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(RubberSupplierCoc)
      .set({ exportedToSageAt: exportedAt } as unknown as RubberSupplierCoc)
      .where({ id: In(ids) })
      .execute();
  }

  findBySupplierCompanyIdLatest(companyId: number): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.supplier_company_id = :companyId", { companyId })
      .orderBy("coc.id", "DESC")
      .getMany();
  }

  findByVersionStatus(versionStatus: DocumentVersionStatus): Promise<RubberSupplierCoc[]> {
    return this.repository.find({ where: { versionStatus } });
  }

  findOneCalendererByCompanyAndExtractedOrder(
    companyId: number,
    orderNumber: string,
  ): Promise<RubberSupplierCoc | null> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .andWhere("coc.supplier_company_id = :companyId", { companyId })
      .andWhere("coc.extracted_data->>'orderNumber' = :order", { order: orderNumber })
      .orderBy("coc.created_at", "DESC")
      .limit(1)
      .getOne();
  }

  findOneCompounderByBatchNumbersOverlap(
    batchNumbers: string[],
  ): Promise<RubberSupplierCoc | null> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .andWhere("coc.extracted_data->'batchNumbers' ?| :batches", { batches: batchNumbers })
      .orderBy("coc.created_at", "DESC")
      .limit(1)
      .getOne();
  }

  findByCocTypeWithOrderNumber(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: cocType })
      .andWhere("coc.order_number IS NOT NULL")
      .orderBy("coc.id", "DESC")
      .getMany();
  }

  async distinctCompoundCodesByCocType(cocType: SupplierCocType): Promise<string[]> {
    const cocs = await this.repository
      .createQueryBuilder("coc")
      .select("DISTINCT coc.compound_code", "compoundCode")
      .where("coc.coc_type = :type", { type: cocType })
      .andWhere("coc.compound_code IS NOT NULL")
      .getRawMany<{ compoundCode: string }>();
    return cocs.map((c) => c.compoundCode).filter((code) => code && code.trim() !== "");
  }

  findOneActiveByNormalizedNumberAndType(
    normalizedCocNumber: string,
    cocType: SupplierCocType,
    options: { excludeId?: number; supplierCompanyId?: number } = {},
  ): Promise<RubberSupplierCoc | null> {
    const qb = this.repository
      .createQueryBuilder("coc")
      .where(
        "LOWER(TRIM(REPLACE(REPLACE(coc.coc_number, ' ', ''), '–', '-'))) = LOWER(:cocNumber)",
        {
          cocNumber: normalizedCocNumber,
        },
      )
      .andWhere("coc.coc_type = :cocType", { cocType })
      .andWhere("coc.version_status = :status", { status: DocumentVersionStatus.ACTIVE });

    if (options.excludeId !== undefined) {
      qb.andWhere("coc.id != :excludeId", { excludeId: options.excludeId });
    }
    if (options.supplierCompanyId !== undefined) {
      qb.andWhere("coc.supplier_company_id = :supplierCompanyId", {
        supplierCompanyId: options.supplierCompanyId,
      });
    }

    return qb.orderBy("coc.id", "DESC").getOne();
  }

  findNewerVersionsByPreviousId(id: number): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("e")
      .where("e.previous_version_id = :id", { id })
      .getMany();
  }

  async repointLinkedDeliveryNoteId(oldId: number, newId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ linkedDeliveryNoteId: newId })
      .where("linked_delivery_note_id = :oldId", { oldId })
      .execute();
  }

  findWithOrderNumberOrderedByIdDesc(): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.order_number IS NOT NULL")
      .orderBy("coc.id", "DESC")
      .getMany();
  }

  findUpstreamCocsByCdnRollTrace(cdnId: number): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .innerJoin(
        "rubber_delivery_notes",
        "sdn",
        "sdn.linked_coc_id = coc.id AND sdn.version_status NOT IN ('REJECTED','SUPERSEDED')",
      )
      .innerJoin("rubber_roll_stock", "rs", "rs.supplier_delivery_note_id = sdn.id")
      .innerJoin(
        "rubber_delivery_note_items",
        "dni",
        "dni.roll_number = rs.roll_number AND dni.delivery_note_id = :cdnId",
        { cdnId },
      )
      .where("coc.version_status NOT IN ('REJECTED','SUPERSEDED')")
      .orderBy("coc.id", "DESC")
      .getMany();
  }

  findActiveWithCocNumberOrderedByIdDesc(): Promise<RubberSupplierCoc[]> {
    return this.repository
      .createQueryBuilder("coc")
      .where("coc.coc_number IS NOT NULL")
      .andWhere("coc.version_status NOT IN ('REJECTED','SUPERSEDED')")
      .orderBy("coc.id", "DESC")
      .getMany();
  }
}
