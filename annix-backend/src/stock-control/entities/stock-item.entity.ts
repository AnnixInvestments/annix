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
import { DeliveryNoteItem } from "./delivery-note-item.entity";
import { JobCard } from "./job-card.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlLocation } from "./stock-control-location.entity";
import { StockMovement } from "./stock-movement.entity";

@Entity("stock_items")
export class StockItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100 })
  sku: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  category: string | null;

  @Column({ name: "unit_of_measure", type: "varchar", length: 50, default: "each" })
  unitOfMeasure: string;

  @Column({ name: "cost_per_unit", type: "numeric", precision: 12, scale: 2, default: 0 })
  costPerUnit: number;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  quantity: number;

  @Column({ name: "min_stock_level", type: "integer", default: 0 })
  minStockLevel: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  location: string | null;

  @ManyToOne(() => StockControlLocation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "location_id" })
  locationEntity: StockControlLocation | null;

  @Column({ name: "location_id", nullable: true })
  locationId: number | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "needs_qr_print", type: "boolean", default: false })
  needsQrPrint: boolean;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @OneToMany(
    () => StockAllocation,
    (allocation) => allocation.stockItem,
  )
  allocations: StockAllocation[];

  @OneToMany(
    () => StockMovement,
    (movement) => movement.stockItem,
  )
  movements: StockMovement[];

  @OneToMany(
    () => DeliveryNoteItem,
    (deliveryNoteItem) => deliveryNoteItem.stockItem,
  )
  deliveryNoteItems: DeliveryNoteItem[];

  @Column({ name: "thickness_mm", type: "decimal", precision: 6, scale: 2, nullable: true })
  thicknessMm: number | null;

  @Column({ name: "width_mm", type: "decimal", precision: 8, scale: 2, nullable: true })
  widthMm: number | null;

  @Column({ name: "length_m", type: "decimal", precision: 10, scale: 2, nullable: true })
  lengthM: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  color: string | null;

  @Column({ name: "compound_code", type: "varchar", length: 50, nullable: true })
  compoundCode: string | null;

  @Column({ name: "pack_size_litres", type: "decimal", precision: 10, scale: 2, nullable: true })
  packSizeLitres: number | null;

  @Column({ name: "component_group", type: "varchar", length: 100, nullable: true })
  componentGroup: string | null;

  @Column({ name: "component_role", type: "varchar", length: 50, nullable: true })
  componentRole: string | null;

  @Column({ name: "mix_ratio", type: "varchar", length: 20, nullable: true })
  mixRatio: string | null;

  @Column({ name: "roll_number", type: "varchar", length: 100, nullable: true })
  rollNumber: string | null;

  @Column({ name: "roll_numbers", type: "jsonb", nullable: true })
  rollNumbers: string[] | null;

  @Column({ name: "source_roll_number", type: "varchar", length: 100, nullable: true })
  sourceRollNumber: string | null;

  @Column({ name: "is_leftover", type: "boolean", default: false })
  isLeftover: boolean;

  @ManyToOne(() => JobCard, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "source_job_card_id" })
  sourceJobCard: JobCard | null;

  @Column({ name: "source_job_card_id", nullable: true })
  sourceJobCardId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
