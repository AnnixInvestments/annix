import type { TradeKey } from "@annix/product-data/sa-market";
import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Boq } from "../../boq/entities/boq.entity";
import { Drawing } from "../../drawings/entities/drawing.entity";
import { User } from "../../user/entities/user.entity";
import { RfqDocument } from "./rfq-document.entity";
import { RfqItem } from "./rfq-item.entity";

export enum RfqStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  PENDING = "pending",
  IN_REVIEW = "in_review",
  QUOTED = "quoted",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

@Entity("rfqs")
export class Rfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "Auto-generated RFQ number",
    example: "RFQ-2025-0001",
  })
  @Column({ name: "rfq_number", unique: true })
  rfqNumber: string;

  // Idempotency key generated client-side on submit. The unique
  // constraint stops duplicate rfqs from being created when the
  // Next.js dev proxy retries a long POST that timed out, when
  // the user double-clicks Submit, or when HMR resets React state
  // mid-submit. Nullable so historical rows aren't broken.
  @ApiProperty({
    description: "Client-generated idempotency key for the submission attempt",
    required: false,
  })
  @Column({ name: "submission_id", type: "varchar", length: 36, nullable: true, unique: true })
  submissionId?: string | null;

  @ApiProperty({
    description: "Project name",
    example: "500NB Pipeline Extension",
  })
  @Column({ name: "project_name" })
  projectName: string;

  @ApiProperty({ description: "Project description", required: false })
  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @ApiProperty({ description: "Customer company name", required: false })
  @Column({ name: "customer_name", nullable: true })
  customerName?: string;

  @ApiProperty({ description: "Customer email", required: false })
  @Column({ name: "customer_email", nullable: true })
  customerEmail?: string;

  @ApiProperty({ description: "Customer phone number", required: false })
  @Column({ name: "customer_phone", nullable: true })
  customerPhone?: string;

  @ApiProperty({ description: "Required delivery date", required: false })
  @Column({ name: "required_date", type: "date", nullable: true })
  requiredDate?: Date | null;

  @ApiProperty({ description: "RFQ status", enum: RfqStatus })
  @Column({
    name: "status",
    type: "enum",
    enum: RfqStatus,
    default: RfqStatus.DRAFT,
  })
  status: RfqStatus;

  @ApiProperty({ description: "Additional notes", required: false })
  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  @ApiProperty({ description: "Total estimated weight in kg", required: false })
  @Column({
    name: "total_estimated_weight",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalWeightKg?: number;

  @ApiProperty({ description: "Total estimated cost", required: false })
  @Column({
    name: "total_quoted_price",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  totalCost?: number;

  @ApiProperty({
    description: "Trades required to deliver this project (for workforce-need linker)",
    required: false,
  })
  @Column({ name: "required_trades", type: "jsonb", nullable: true })
  requiredTrades?: TradeKey[] | null;

  @ApiProperty({ description: "Estimated headcount for the project", required: false })
  @Column({ name: "estimated_headcount", type: "int", nullable: true })
  estimatedHeadcount?: number | null;

  @ApiProperty({
    description: "Radius around project site to search for candidates (km)",
    required: false,
  })
  @Column({ name: "radius_km", type: "int", nullable: true })
  radiusKm?: number | null;

  @ApiProperty({ description: "Project site location (free text for geocoding)", required: false })
  @Column({ name: "project_location", type: "varchar", length: 500, nullable: true })
  projectLocation?: string | null;

  @ApiProperty({ description: "Geocoded project lat", required: false })
  @Column({ name: "project_location_lat", type: "double precision", nullable: true })
  projectLocationLat?: number | null;

  @ApiProperty({ description: "Geocoded project lon", required: false })
  @Column({ name: "project_location_lon", type: "double precision", nullable: true })
  projectLocationLon?: number | null;

  @ApiProperty({
    description: "User who created this RFQ",
    type: () => User,
    required: false,
  })
  @ManyToOne(
    () => User,
    (user) => user.rfqs,
    { nullable: true },
  )
  @JoinColumn({ name: "created_by_user_id" })
  createdBy?: User;

  @ApiProperty({ description: "RFQ items", type: () => [RfqItem] })
  @OneToMany(
    () => RfqItem,
    (item) => item.rfq,
    { cascade: true },
  )
  items: RfqItem[];

  @ApiProperty({ description: "Attached documents", type: () => [RfqDocument] })
  @OneToMany(
    () => RfqDocument,
    (doc) => doc.rfq,
    { cascade: true },
  )
  documents: RfqDocument[];

  @ApiProperty({ description: "Linked drawings", type: () => [Drawing] })
  @OneToMany(
    () => Drawing,
    (drawing) => drawing.rfq,
  )
  drawings: Drawing[];

  @ApiProperty({ description: "Linked BOQs", type: () => [Boq] })
  @OneToMany(
    () => Boq,
    (boq) => boq.rfq,
  )
  boqs: Boq[];

  @ApiProperty({ description: "Creation date" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
