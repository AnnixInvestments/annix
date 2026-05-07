import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { NixExtraction } from "./nix-extraction.entity";

/**
 * Lifecycle of a NixExtractionSession.
 *
 * - draft: user is still uploading documents into the session.
 * - reviewing: all uploads complete, user is on the draft review page
 *   editing extracted items.
 * - promoted: items have been turned into a real domain entity (an RFQ,
 *   an ASCA quote, a job card etc.) — the session is closed.
 * - archived: the user discarded the session without promoting.
 */
export enum NixExtractionSessionStatus {
  DRAFT = "draft",
  REVIEWING = "reviewing",
  PROMOTED = "promoted",
  ARCHIVED = "archived",
}

/**
 * Groups multiple Nix extractions that belong to the same upload event so
 * they can be processed and reviewed as a single quote pack.
 *
 * The session is the cornerstone of #253 task B's cross-document linker —
 * drawings extracted first inside the session, then specs extracted with
 * the drawings' items as Gemini context, so paint codes / material classes
 * referenced on the drawings get matched to the spec clauses that define
 * them.
 *
 * Design notes
 * ------------
 * - sourceModule + sourceId let any host app own a session ("asca" for the
 *   ASCA quoting flow today; "rfq" for the RFQ wizard tomorrow). Keeps
 *   Nix host-app-agnostic, mirrors the polymorphic source linkage already
 *   on NixExtraction.
 * - status is a small enum so the UI can drive the user through draft →
 *   reviewing → promoted without per-app state tables.
 * - title is optional — populated either by Nix from the first extracted
 *   document's project metadata, or by the user on the review page.
 * - promotedRef captures the natural-key reference of the entity the
 *   session was promoted into (e.g. "QUO-2026-0193"). This is durable
 *   even if FKs to the host-app table aren't desirable from the Nix module.
 */
@Entity("nix_extraction_sessions")
@Index("idx_nix_sessions_source", ["sourceModule", "sourceId"])
@Index("idx_nix_sessions_owner", ["ownerUserId"])
export class NixExtractionSession {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "Owning module key — 'asca', 'rfq', etc.",
  })
  @Column({ name: "source_module", type: "varchar", length: 64 })
  sourceModule: string;

  @ApiProperty({
    description:
      "Source entity ID within the owning module — e.g. ASCA quote draft id or future RFQ session id. Null until the host app links it back.",
    required: false,
  })
  @Column({ name: "source_id", type: "int", nullable: true })
  sourceId?: number;

  @ApiProperty({
    description: "Profile that drives prompts and post-extract logic for this session.",
  })
  @Column({ name: "extraction_profile", type: "varchar", length: 64 })
  extractionProfile: string;

  @ApiProperty({ enum: NixExtractionSessionStatus })
  @Column({
    name: "status",
    type: "varchar",
    length: 32,
    default: NixExtractionSessionStatus.DRAFT,
  })
  status: NixExtractionSessionStatus;

  @ApiProperty({
    description:
      "Human-readable title — usually the project name pulled from the first extraction.",
    required: false,
  })
  @Column({ type: "varchar", length: 256, nullable: true })
  title?: string;

  @ApiProperty({
    description: "Optional reference (e.g. customer's RFQ number).",
    required: false,
  })
  @Column({ name: "external_reference", type: "varchar", length: 128, nullable: true })
  externalReference?: string;

  @ApiProperty({
    description:
      "Natural-key reference of the host-app entity the session was promoted to (e.g. 'QUO-2026-0193').",
    required: false,
  })
  @Column({ name: "promoted_ref", type: "varchar", length: 128, nullable: true })
  promotedRef?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "owner_user_id" })
  ownerUser?: User;

  @Column({ name: "owner_user_id", nullable: true })
  ownerUserId?: number;

  @OneToMany(
    () => NixExtraction,
    (extraction) => extraction.session,
  )
  extractions?: NixExtraction[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
