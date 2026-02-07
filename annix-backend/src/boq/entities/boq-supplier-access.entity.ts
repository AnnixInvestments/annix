import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";
import { Boq } from "./boq.entity";

export enum SupplierBoqStatus {
  PENDING = "pending", // Awaiting supplier response
  VIEWED = "viewed", // Supplier has viewed the BOQ
  QUOTED = "quoted", // Supplier has submitted quote
  DECLINED = "declined", // Supplier declined to quote
  EXPIRED = "expired", // Quote deadline passed
}

/**
 * Tracks which suppliers have access to which BOQs and which sections they can see.
 * This is the core table for BOQ distribution to suppliers.
 */
@Entity("boq_supplier_access")
@Index(["boqId"])
@Index(["supplierProfileId"])
@Index(["status"])
@Unique(["boqId", "supplierProfileId"]) // Each supplier can only have one access record per BOQ
export class BoqSupplierAccess {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Parent BOQ", type: () => Boq })
  @ManyToOne(() => Boq, { onDelete: "CASCADE" })
  @JoinColumn({ name: "boq_id" })
  boq: Boq;

  @Column({ name: "boq_id" })
  boqId: number;

  @ApiProperty({ description: "Supplier Profile", type: () => SupplierProfile })
  @ManyToOne(() => SupplierProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "supplier_profile_id" })
  supplierProfile: SupplierProfile;

  @Column({ name: "supplier_profile_id" })
  supplierProfileId: number;

  @ApiProperty({
    description: "List of BOQ sections this supplier can access",
    example: ["straight_pipes", "bends", "flanges"],
  })
  @Column({ type: "jsonb", name: "allowed_sections" })
  allowedSections: string[]; // Section types supplier can see

  @ApiProperty({
    description: "Supplier response status",
    enum: SupplierBoqStatus,
  })
  @Column({
    name: "status",
    type: "enum",
    enum: SupplierBoqStatus,
    default: SupplierBoqStatus.PENDING,
  })
  status: SupplierBoqStatus;

  @ApiProperty({ description: "When supplier first viewed the BOQ" })
  @Column({ name: "viewed_at", type: "timestamp", nullable: true })
  viewedAt?: Date;

  @ApiProperty({ description: "When supplier responded (quoted/declined)" })
  @Column({ name: "responded_at", type: "timestamp", nullable: true })
  respondedAt?: Date;

  @ApiProperty({ description: "When notification was sent to supplier" })
  @Column({ name: "notification_sent_at", type: "timestamp", nullable: true })
  notificationSentAt?: Date;

  @ApiProperty({ description: "Reason for declining (if declined)" })
  @Column({ name: "decline_reason", type: "text", nullable: true })
  declineReason?: string;

  @ApiProperty({
    description: "Days before deadline to send email reminder (1, 3, or 7)",
  })
  @Column({ name: "reminder_days", type: "int", nullable: true })
  reminderDays?: number;

  @ApiProperty({ description: "Whether reminder email has been sent" })
  @Column({ name: "reminder_sent", type: "boolean", default: false })
  reminderSent: boolean;

  @ApiProperty({ description: "Customer info for display to supplier" })
  @Column({ type: "jsonb", name: "customer_info", nullable: true })
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };

  @ApiProperty({ description: "Project info for display to supplier" })
  @Column({ type: "jsonb", name: "project_info", nullable: true })
  projectInfo?: {
    name: string;
    description?: string;
    requiredDate?: string;
  };

  @ApiProperty({
    description: "Quote data including pricing inputs and unit prices",
  })
  @Column({ type: "jsonb", name: "quote_data", nullable: true })
  quoteData?: {
    pricingInputs: Record<string, any>;
    unitPrices: Record<string, Record<number, number>>;
    weldUnitPrices: Record<string, number>;
  };

  @ApiProperty({ description: "When quote progress was last saved" })
  @Column({ name: "quote_saved_at", type: "timestamp", nullable: true })
  quoteSavedAt?: Date;

  @ApiProperty({ description: "When quote was submitted" })
  @Column({ name: "quote_submitted_at", type: "timestamp", nullable: true })
  quoteSubmittedAt?: Date;

  @ApiProperty({ description: "Creation date" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
