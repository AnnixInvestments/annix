import { Injectable, NotFoundException } from "@nestjs/common";
import { BaseCrudService } from "../../lib/base-crud.service";
import { MineRegistryService } from "../../mines/mine-registry.service";
import {
  NixExtractionSession,
  NixExtractionSessionStatus,
} from "../entities/nix-extraction-session.entity";
import { NixExtractionSessionRepository } from "../nix-extraction-session.repository";

export interface CreateNixSessionDto {
  sourceModule: string;
  extractionProfile: string;
  ownerUserId?: number;
  title?: string;
  externalReference?: string;
}

export interface UpdateNixSessionDto {
  status?: NixExtractionSessionStatus;
  title?: string;
  externalReference?: string;
  sourceId?: number;
  promotedRef?: string;
  quoteEditorState?: Record<string, unknown>;
  customerCompanyId?: number | null;
  customerSnapshot?: Record<string, unknown> | null;
  customerOrderNumber?: string | null;
  deliveryNoteRef?: string | null;
  quoteNotes?: Record<string, unknown> | null;
  submittedAt?: Date | null;
  jobCardId?: number | null;
}

@Injectable()
export class NixExtractionSessionService extends BaseCrudService<
  NixExtractionSession,
  CreateNixSessionDto,
  UpdateNixSessionDto
> {
  constructor(
    private readonly sessionRepository: NixExtractionSessionRepository,
    private readonly mineRegistry: MineRegistryService,
  ) {
    super(sessionRepository, {
      entityName: "NixExtractionSession",
      defaultRelations: ["extractions"],
    });
  }

  private async enrichExtractionMineNames(
    session: NixExtractionSession,
  ): Promise<NixExtractionSession> {
    const extractions = session.extractions ?? [];
    const needsResolve = extractions.some((e) => e.mineId != null && e.mineCountry != null);
    if (!needsResolve) return session;
    const allMines = await this.mineRegistry.allMines();
    const lookup = new Map<string, string>();
    for (const m of allMines) {
      lookup.set(`${m.country}:${m.id}`, m.mineName);
    }
    for (const ex of extractions) {
      if (ex.mineId != null && ex.mineCountry != null) {
        const name = lookup.get(`${ex.mineCountry}:${ex.mineId}`);
        if (name) ex.mineName = name;
      }
    }
    return session;
  }

  override async findOne(id: number): Promise<NixExtractionSession> {
    const session = await super.findOne(id);
    return this.enrichExtractionMineNames(session);
  }

  async sessionsForOwner(
    ownerUserId: number,
    filters: { sourceModule?: string; status?: NixExtractionSessionStatus } = {},
  ): Promise<NixExtractionSession[]> {
    return this.sessionRepository.sessionsForOwner(ownerUserId, filters);
  }

  async sessionsForSource(sourceModule: string, sourceId: number): Promise<NixExtractionSession[]> {
    return this.sessionRepository.sessionsForSource(sourceModule, sourceId);
  }

  async setStatus(id: number, status: NixExtractionSessionStatus): Promise<NixExtractionSession> {
    return this.update(id, { status });
  }

  async deleteSessionPreservingExtractions(id: number): Promise<void> {
    await this.sessionRepository.unlinkExtractionsFromSession(id);
    await this.remove(id);
  }

  async promote(id: number, promotedRef: string): Promise<NixExtractionSession> {
    return this.update(id, {
      status: NixExtractionSessionStatus.PROMOTED,
      promotedRef,
    });
  }

  async setQuoteEditorState(
    id: number,
    state: Record<string, unknown> | null,
  ): Promise<NixExtractionSession> {
    return this.update(id, { quoteEditorState: state ?? undefined });
  }

  async setCustomerOrderNumber(
    id: number,
    orderNumber: string | null,
  ): Promise<NixExtractionSession> {
    const trimmed = orderNumber ? orderNumber.trim() : "";
    return this.update(id, { customerOrderNumber: trimmed.length > 0 ? trimmed : null });
  }

  async setDeliveryNoteRef(id: number, ref: string | null): Promise<NixExtractionSession> {
    const trimmed = ref ? ref.trim() : "";
    return this.update(id, { deliveryNoteRef: trimmed.length > 0 ? trimmed : null });
  }

  async setQuoteNotes(
    id: number,
    notes: Record<string, unknown> | null,
  ): Promise<NixExtractionSession> {
    return this.update(id, { quoteNotes: notes });
  }

  /**
   * Stamps the session as submitted by setting submittedAt to NOW() and,
   * when supplied, snapshots the quote grand total incl VAT so the
   * Quotations hub can show a Value column without recomputing every
   * quote's pooled m² x rate maths. Used by the "Submit Quote" button on
   * the working quote page. Does NOT change the session status — the quote
   * stays in 'promoted' and remains editable via auto-save. A re-submit
   * refreshes both the timestamp and the total.
   */
  async markSubmitted(id: number, quoteTotalIncVat?: number): Promise<NixExtractionSession> {
    const patch: Partial<NixExtractionSession> = { submittedAt: new Date() };
    if (quoteTotalIncVat !== undefined) patch.quoteTotalIncVat = quoteTotalIncVat;
    return this.update(id, patch);
  }

  async setCustomer(
    id: number,
    params: {
      companyId: number | null;
      snapshot: Record<string, unknown> | null;
    },
  ): Promise<NixExtractionSession> {
    return this.update(id, {
      customerCompanyId: params.companyId,
      customerSnapshot: params.snapshot,
    });
  }

  async findOneForUser(
    id: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<NixExtractionSession> {
    const session = await this.findOne(id);
    if (!isAdmin && session.ownerUserId !== userId) {
      throw new NotFoundException(`${this.entityName} ${id} not found`);
    }
    return session;
  }
}
