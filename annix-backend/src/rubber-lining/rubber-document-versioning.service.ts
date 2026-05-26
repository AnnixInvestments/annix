import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  DOCUMENT_VERSION_STATUS_LABELS,
  DocumentVersionStatus,
} from "./entities/document-version.types";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RubberSupplierCoc, SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { RubberTaxInvoice, TaxInvoiceType } from "./entities/rubber-tax-invoice.entity";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { RubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository";
import { RubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository";

export type VersionableEntityType = "tax-invoice" | "delivery-note" | "supplier-coc";

type VersionableEntity = RubberTaxInvoice | RubberDeliveryNote | RubberSupplierCoc;

interface VersionableRepository<T extends VersionableEntity> {
  findById(id: number): Promise<T | null>;
  save(entity: T): Promise<T>;
  findNewerVersionsByPreviousId(id: number): Promise<T[]>;
}

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
    private taxInvoiceRepository: RubberTaxInvoiceRepository,
    private deliveryNoteRepository: RubberDeliveryNoteRepository,
    private supplierCocRepository: RubberSupplierCocRepository,
  ) {}

  async existingActiveTaxInvoice(
    invoiceNumber: string,
    companyId: number,
    invoiceType: TaxInvoiceType,
  ): Promise<RubberTaxInvoice | null> {
    if (!invoiceNumber) return null;

    return this.taxInvoiceRepository.findOneActiveByNumberCompanyAndType(
      invoiceNumber,
      companyId,
      invoiceType,
    );
  }

  async existingActiveDeliveryNote(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null> {
    if (!deliveryNoteNumber) return null;

    return this.deliveryNoteRepository.findOneActiveByNumberAndSupplier(
      deliveryNoteNumber,
      supplierCompanyId,
    );
  }

  async existingActiveSupplierCoc(
    cocNumber: string,
    cocType: SupplierCocType,
    options: { excludeId?: number; supplierCompanyId?: number } = {},
  ): Promise<RubberSupplierCoc | null> {
    if (!cocNumber) return null;

    const normalized = cocNumber.trim().replace(/\s+/g, "").replace(/[–—]/g, "-");

    return this.supplierCocRepository.findOneActiveByNormalizedNumberAndType(
      normalized,
      cocType,
      options,
    );
  }

  async repointSupplierCocReferences(oldId: number, newId: number): Promise<void> {
    await this.updateDownstreamReferences("supplier-coc", oldId, newId);
  }

  async authorizeVersion(
    entityType: VersionableEntityType,
    id: number,
  ): Promise<{ authorizedId: number; supersededId: number | null }> {
    const repo = this.repositoryForType(entityType);
    const entity = await repo.findById(id);

    if (!entity) {
      throw new BadRequestException(`${entityType} not found`);
    }

    if (
      (entity as VersionableEntity).versionStatus !== DocumentVersionStatus.PENDING_AUTHORIZATION
    ) {
      throw new BadRequestException("Only documents awaiting authorization can be authorized");
    }

    const previousVersionId = (entity as VersionableEntity).previousVersionId;
    let supersededId: number | null = null;

    if (previousVersionId) {
      const previousVersion = await repo.findById(previousVersionId);
      if (
        previousVersion &&
        (previousVersion as VersionableEntity).versionStatus === DocumentVersionStatus.ACTIVE
      ) {
        (previousVersion as VersionableEntity).versionStatus = DocumentVersionStatus.SUPERSEDED;
        await repo.save(previousVersion);
        supersededId = previousVersionId;

        await this.updateDownstreamReferences(entityType, previousVersionId, id);
      }
    }

    (entity as VersionableEntity).versionStatus = DocumentVersionStatus.ACTIVE;
    await repo.save(entity);

    this.logger.log(
      `Authorized ${entityType} #${id} (v${(entity as VersionableEntity).version}), superseded #${supersededId}`,
    );

    return { authorizedId: id, supersededId };
  }

  async rejectVersion(entityType: VersionableEntityType, id: number): Promise<void> {
    const repo = this.repositoryForType(entityType);
    const entity = await repo.findById(id);

    if (!entity) {
      throw new BadRequestException(`${entityType} not found`);
    }

    if (
      (entity as VersionableEntity).versionStatus !== DocumentVersionStatus.PENDING_AUTHORIZATION
    ) {
      throw new BadRequestException("Only documents awaiting authorization can be rejected");
    }

    (entity as VersionableEntity).versionStatus = DocumentVersionStatus.REJECTED;
    await repo.save(entity);

    this.logger.log(`Rejected ${entityType} #${id} (v${(entity as VersionableEntity).version})`);
  }

  async versionHistory(
    entityType: VersionableEntityType,
    id: number,
  ): Promise<VersionHistoryEntry[]> {
    const repo = this.repositoryForType(entityType);
    const entity = await repo.findById(id);

    if (!entity) return [];

    const chain: VersionHistoryEntry[] = [];
    let current: VersionableEntity | null = entity;

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
        current = await repo.findById(current.previousVersionId);
      } else {
        current = null;
      }
    }

    const newerVersions = await repo.findNewerVersionsByPreviousId(id);

    const newerEntries = newerVersions
      .filter((v) => !chain.some((c) => c.id === v.id))
      .map((v) => ({
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

  private repositoryForType(
    entityType: VersionableEntityType,
  ): VersionableRepository<VersionableEntity> {
    if (entityType === "tax-invoice") {
      return this.taxInvoiceRepository as VersionableRepository<VersionableEntity>;
    }
    if (entityType === "delivery-note") {
      return this.deliveryNoteRepository as VersionableRepository<VersionableEntity>;
    }
    return this.supplierCocRepository as VersionableRepository<VersionableEntity>;
  }

  private async updateDownstreamReferences(
    entityType: VersionableEntityType,
    oldId: number,
    newId: number,
  ): Promise<void> {
    if (entityType === "supplier-coc") {
      await this.deliveryNoteRepository.repointLinkedCocId(oldId, newId);

      this.logger.log(`Updated delivery note linked_coc_id references from #${oldId} to #${newId}`);
    } else if (entityType === "delivery-note") {
      await this.supplierCocRepository.repointLinkedDeliveryNoteId(oldId, newId);

      this.logger.log(
        `Updated supplier CoC linked_delivery_note_id references from #${oldId} to #${newId}`,
      );
    }
  }
}
