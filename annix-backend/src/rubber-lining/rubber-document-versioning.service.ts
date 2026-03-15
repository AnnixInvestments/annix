import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  DOCUMENT_VERSION_STATUS_LABELS,
  DocumentVersionStatus,
} from "./entities/document-version.types";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RubberSupplierCoc, SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { RubberTaxInvoice, TaxInvoiceType } from "./entities/rubber-tax-invoice.entity";

export type VersionableEntityType = "tax-invoice" | "delivery-note" | "supplier-coc";

export interface VersionHistoryEntry {
  id: number;
  version: number;
  versionStatus: DocumentVersionStatus;
  versionStatusLabel: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RubberDocumentVersioningService {
  private readonly logger = new Logger(RubberDocumentVersioningService.name);

  constructor(
    @InjectRepository(RubberTaxInvoice)
    private taxInvoiceRepository: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberDeliveryNote)
    private deliveryNoteRepository: Repository<RubberDeliveryNote>,
    @InjectRepository(RubberSupplierCoc)
    private supplierCocRepository: Repository<RubberSupplierCoc>,
  ) {}

  async existingActiveTaxInvoice(
    invoiceNumber: string,
    companyId: number,
    invoiceType: TaxInvoiceType,
  ): Promise<RubberTaxInvoice | null> {
    if (!invoiceNumber) return null;

    return this.taxInvoiceRepository
      .createQueryBuilder("ti")
      .where("LOWER(TRIM(ti.invoice_number)) = LOWER(TRIM(:invoiceNumber))", { invoiceNumber })
      .andWhere("ti.company_id = :companyId", { companyId })
      .andWhere("ti.invoice_type = :invoiceType", { invoiceType })
      .andWhere("ti.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .getOne();
  }

  async existingActiveDeliveryNote(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null> {
    if (!deliveryNoteNumber) return null;

    return this.deliveryNoteRepository
      .createQueryBuilder("dn")
      .where("LOWER(TRIM(dn.delivery_note_number)) = LOWER(TRIM(:deliveryNoteNumber))", {
        deliveryNoteNumber,
      })
      .andWhere("dn.supplier_company_id = :supplierCompanyId", { supplierCompanyId })
      .andWhere("dn.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .getOne();
  }

  async existingActiveSupplierCoc(
    cocNumber: string,
    cocType: SupplierCocType,
  ): Promise<RubberSupplierCoc | null> {
    if (!cocNumber) return null;

    const normalized = cocNumber.trim().replace(/\s+/g, "").replace(/[–—]/g, "-");

    return this.supplierCocRepository
      .createQueryBuilder("coc")
      .where(
        "LOWER(TRIM(REPLACE(REPLACE(coc.coc_number, ' ', ''), '–', '-'))) = LOWER(:cocNumber)",
        {
          cocNumber: normalized,
        },
      )
      .andWhere("coc.coc_type = :cocType", { cocType })
      .andWhere("coc.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .getOne();
  }

  async authorizeVersion(
    entityType: VersionableEntityType,
    id: number,
  ): Promise<{ authorizedId: number; supersededId: number | null }> {
    const repo = this.repositoryForType(entityType);
    const entity = await repo.findOne({ where: { id } as any });

    if (!entity) {
      throw new BadRequestException(`${entityType} not found`);
    }

    if ((entity as any).versionStatus !== DocumentVersionStatus.PENDING_AUTHORIZATION) {
      throw new BadRequestException("Only documents awaiting authorization can be authorized");
    }

    const previousVersionId = (entity as any).previousVersionId;
    let supersededId: number | null = null;

    if (previousVersionId) {
      const previousVersion = await repo.findOne({ where: { id: previousVersionId } as any });
      if (
        previousVersion &&
        (previousVersion as any).versionStatus === DocumentVersionStatus.ACTIVE
      ) {
        (previousVersion as any).versionStatus = DocumentVersionStatus.SUPERSEDED;
        await repo.save(previousVersion as any);
        supersededId = previousVersionId;

        await this.updateDownstreamReferences(entityType, previousVersionId, id);
      }
    }

    (entity as any).versionStatus = DocumentVersionStatus.ACTIVE;
    await repo.save(entity as any);

    this.logger.log(
      `Authorized ${entityType} #${id} (v${(entity as any).version}), superseded #${supersededId}`,
    );

    return { authorizedId: id, supersededId };
  }

  async rejectVersion(entityType: VersionableEntityType, id: number): Promise<void> {
    const repo = this.repositoryForType(entityType);
    const entity = await repo.findOne({ where: { id } as any });

    if (!entity) {
      throw new BadRequestException(`${entityType} not found`);
    }

    if ((entity as any).versionStatus !== DocumentVersionStatus.PENDING_AUTHORIZATION) {
      throw new BadRequestException("Only documents awaiting authorization can be rejected");
    }

    (entity as any).versionStatus = DocumentVersionStatus.REJECTED;
    await repo.save(entity as any);

    this.logger.log(`Rejected ${entityType} #${id} (v${(entity as any).version})`);
  }

  async versionHistory(
    entityType: VersionableEntityType,
    id: number,
  ): Promise<VersionHistoryEntry[]> {
    const repo = this.repositoryForType(entityType);
    const entity = await repo.findOne({ where: { id } as any });

    if (!entity) return [];

    const chain: VersionHistoryEntry[] = [];
    let current: any = entity;

    while (current) {
      chain.push({
        id: current.id,
        version: current.version,
        versionStatus: current.versionStatus,
        versionStatusLabel:
          DOCUMENT_VERSION_STATUS_LABELS[current.versionStatus as DocumentVersionStatus],
        createdAt: current.createdAt.toISOString(),
        updatedAt: current.updatedAt.toISOString(),
      });

      if (current.previousVersionId) {
        current = await repo.findOne({ where: { id: current.previousVersionId } as any });
      } else {
        current = null;
      }
    }

    const newerVersions = await repo
      .createQueryBuilder("e")
      .where("e.previous_version_id = :id", { id })
      .getMany();

    const newerEntries = newerVersions
      .filter((v: any) => !chain.some((c) => c.id === v.id))
      .map((v: any) => ({
        id: v.id,
        version: v.version,
        versionStatus: v.versionStatus,
        versionStatusLabel:
          DOCUMENT_VERSION_STATUS_LABELS[v.versionStatus as DocumentVersionStatus],
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      }));

    return [...newerEntries, ...chain].sort((a, b) => b.version - a.version);
  }

  private repositoryForType(entityType: VersionableEntityType): Repository<any> {
    if (entityType === "tax-invoice") return this.taxInvoiceRepository;
    if (entityType === "delivery-note") return this.deliveryNoteRepository;
    return this.supplierCocRepository;
  }

  private async updateDownstreamReferences(
    entityType: VersionableEntityType,
    oldId: number,
    newId: number,
  ): Promise<void> {
    if (entityType === "supplier-coc") {
      await this.deliveryNoteRepository
        .createQueryBuilder()
        .update()
        .set({ linkedCocId: newId })
        .where("linked_coc_id = :oldId", { oldId })
        .execute();

      this.logger.log(`Updated delivery note linked_coc_id references from #${oldId} to #${newId}`);
    } else if (entityType === "delivery-note") {
      await this.supplierCocRepository
        .createQueryBuilder()
        .update()
        .set({ linkedDeliveryNoteId: newId })
        .where("linked_delivery_note_id = :oldId", { oldId })
        .execute();

      this.logger.log(
        `Updated supplier CoC linked_delivery_note_id references from #${oldId} to #${newId}`,
      );
    }
  }
}
