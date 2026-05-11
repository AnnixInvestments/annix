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
   */
  async sessionsForOwner(ownerUserId: number): Promise<NixExtractionSession[]> {
    return this.repo.find({
      where: { ownerUserId },
      order: { createdAt: "DESC" },
      take: 50,
      relations: ["extractions"],
    });
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
