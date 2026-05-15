import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BaseCrudService } from "../../lib/base-crud.service";
import { MineRegistryService } from "../../mines/mine-registry.service";
import {
  NixExtractionSession,
  NixExtractionSessionStatus,
} from "../entities/nix-extraction-session.entity";

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
    @InjectRepository(NixExtractionSession)
    repo: Repository<NixExtractionSession>,
    private readonly mineRegistry: MineRegistryService,
  ) {
    super(repo, {
      entityName: "NixExtractionSession",
      defaultRelations: ["extractions"],
    });
  }

  /**
   * Joins each extraction in the session with its mine name, resolved
   * across the relevant country table. The badge UI relies on
   * `extraction.mineName` to render 'Tagged: Langer Heinrich Uranium
   * Mine (80%)' instead of 'Tagged: Mine #2 (80%)'. Without this
   * post-processing the badge has only `mine_id` + `mine_country` and
   * can't resolve the friendly name.
   *
   * Batched: one allMines() round-trip regardless of session size, then
   * an in-memory lookup per extraction. Cheap.
   */
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

  /**
   * Sessions visible to a particular user — they own them or they're an
   * admin viewing all. The controller layer is responsible for applying the
   * admin override; this method returns ownership-scoped results.
   *
   * Filters (sourceModule / status) are pushed to SQL rather than applied in
   * memory — the Quotations page fires two calls (drafts + promoted), and
   * fetching ALL sessions twice then filtering 49 of every 50 away in JS
   * showed up as the dominant network-egress query in pg_stat_statements
   * (issue #203). Only `ext.id` is pulled from the extractions join so the
   * frontend's `s.extractions.length` count still works without shipping
   * the heavy jsonb columns (extracted_data, extracted_items, raw_text)
   * over the wire.
   */
  async sessionsForOwner(
    ownerUserId: number,
    filters: { sourceModule?: string; status?: NixExtractionSessionStatus } = {},
  ): Promise<NixExtractionSession[]> {
    const qb = this.repo
      .createQueryBuilder("session")
      .leftJoin("session.extractions", "ext")
      .addSelect("ext.id")
      .where("session.ownerUserId = :ownerUserId", { ownerUserId })
      .orderBy("session.createdAt", "DESC")
      .take(50);
    if (filters.sourceModule) {
      qb.andWhere("session.sourceModule = :sourceModule", {
        sourceModule: filters.sourceModule,
      });
    }
    if (filters.status) {
      qb.andWhere("session.status = :status", { status: filters.status });
    }
    return qb.getMany();
  }

  /**
   * Looks up sessions tied to a particular host-app entity. Useful for the
   * draft review UI to find existing sessions before creating a new one
   * (e.g. "an asca quote draft already has a Nix session — reuse it").
   */
  async sessionsForSource(sourceModule: string, sourceId: number): Promise<NixExtractionSession[]> {
    return this.repo.find({
      where: { sourceModule, sourceId },
      order: { createdAt: "DESC" },
      relations: ["extractions"],
    });
  }

  async setStatus(id: number, status: NixExtractionSessionStatus): Promise<NixExtractionSession> {
    return this.update(id, { status });
  }

  /**
   * Deletes a draft session, but unlinks (rather than deletes) its
   * extractions so they remain available for cross-quote reuse — a doc
   * extracted for draft A can still be reused by draft B even after A
   * is deleted. The session row goes; the extraction rows stay with
   * session_id set to null. Phase 3's findExistingForMine query
   * doesn't filter on session_id so it'll find these orphaned rows
   * just fine.
   */
  async deleteSessionPreservingExtractions(id: number): Promise<void> {
    const manager = this.repo.manager;
    await manager.query("UPDATE nix_extractions SET session_id = NULL WHERE session_id = $1", [id]);
    await this.remove(id);
  }

  async promote(id: number, promotedRef: string): Promise<NixExtractionSession> {
    return this.update(id, {
      status: NixExtractionSessionStatus.PROMOTED,
      promotedRef,
    });
  }

  /**
   * Stores the QuoteSpecsEditor's state bundle (supplier overrides, rates,
   * attachment metadata) on the session as opaque JSONB. Replaces any prior
   * state. Shape is owned by the frontend — the backend doesn't introspect
   * it. Called on every debounced edit from the promoted-quote page.
   */
  async setQuoteEditorState(
    id: number,
    state: Record<string, unknown> | null,
  ): Promise<NixExtractionSession> {
    return this.update(id, { quoteEditorState: state ?? undefined });
  }

  /**
   * Stores the customer's order / PO reference for the quote header. Empty
   * string clears the value (stored as null) — handles the case where the
   * user blanks the field. Debounce-saved like quoteEditorState.
   */
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

  /**
   * Stores the free-text notes bundle (per-pool + general) for the
   * customer-facing PDF as opaque JSONB. Replaces the prior payload.
   * Debounce-saved 1 s after the last keystroke from the QuoteView's
   * notes inputs.
   */
  async setQuoteNotes(
    id: number,
    notes: Record<string, unknown> | null,
  ): Promise<NixExtractionSession> {
    return this.update(id, { quoteNotes: notes });
  }

  /**
   * Stamps the session as submitted by setting submittedAt to NOW().
   * Used by the "Submit Quote" button on the working quote page. Does
   * NOT change the session status — the quote stays in 'promoted' and
   * remains editable via auto-save. The timestamp is purely a display
   * indicator on the Quotations hub.
   */
  async markSubmitted(id: number): Promise<NixExtractionSession> {
    return this.update(id, { submittedAt: new Date() });
  }

  /**
   * Assigns (or clears) the customer for this session. `companyId` is the
   * FK to the master companies table when the quoter picked from the
   * existing list (or saved a new entry to master). `snapshot` is the
   * point-in-time record of customer details captured at quote time so the
   * PDF stays stable if the master row is later edited. Pass both as null
   * to clear the assignment entirely.
   */
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

  /**
   * Loads a session and confirms the requester owns it (or is admin).
   * Throws NotFoundException for missing sessions and the standard CRUD
   * forbidden behaviour for non-owners.
   */
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
