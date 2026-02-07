import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PumpProduct } from "../../pump-product/entities/pump-product.entity";
import { PumpOrder } from "./pump-order.entity";

export enum PumpOrderItemType {
  NEW_PUMP = "new_pump",
  SPARE_PART = "spare_part",
  ACCESSORY = "accessory",
  SERVICE = "service",
}

@Entity("pump_order_items")
export class PumpOrderItem {
  @ApiProperty({ description: "Primary key" })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => PumpOrder,
    (order) => order.items,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "order_id" })
  order: PumpOrder;

  @ApiProperty({ description: "Order ID" })
  @Column({ name: "order_id", type: "int" })
  orderId: number;

  @ManyToOne(() => PumpProduct, { nullable: true })
  @JoinColumn({ name: "product_id" })
  product: PumpProduct | null;

  @ApiProperty({ description: "Product ID from catalog" })
  @Column({ name: "product_id", type: "int", nullable: true })
  productId: number | null;

  @ApiProperty({ description: "Item type", enum: PumpOrderItemType })
  @Column({
    name: "item_type",
    type: "enum",
    enum: PumpOrderItemType,
    default: PumpOrderItemType.NEW_PUMP,
  })
  itemType: PumpOrderItemType;

  @ApiProperty({ description: "Line item description" })
  @Column({ name: "description", type: "text" })
  description: string;

  @ApiProperty({ description: "Pump type code" })
  @Column({ name: "pump_type", type: "varchar", length: 100, nullable: true })
  pumpType: string | null;

  @ApiProperty({ description: "Manufacturer" })
  @Column({
    name: "manufacturer",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  manufacturer: string | null;

  @ApiProperty({ description: "Model number" })
  @Column({
    name: "model_number",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  modelNumber: string | null;

  @ApiProperty({ description: "Part number/SKU" })
  @Column({ name: "part_number", type: "varchar", length: 100, nullable: true })
  partNumber: string | null;

  @ApiProperty({ description: "Flow rate in m³/h" })
  @Column({
    name: "flow_rate",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  flowRate: number | null;

  @ApiProperty({ description: "Head in meters" })
  @Column({
    name: "head",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  head: number | null;

  @ApiProperty({ description: "Motor power in kW" })
  @Column({
    name: "motor_power_kw",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  motorPowerKw: number | null;

  @ApiProperty({ description: "Casing material" })
  @Column({
    name: "casing_material",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  casingMaterial: string | null;

  @ApiProperty({ description: "Impeller material" })
  @Column({
    name: "impeller_material",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  impellerMaterial: string | null;

  @ApiProperty({ description: "Seal type" })
  @Column({ name: "seal_type", type: "varchar", length: 50, nullable: true })
  sealType: string | null;

  @ApiProperty({ description: "Quantity ordered" })
  @Column({ name: "quantity", type: "int", default: 1 })
  quantity: number;

  @ApiProperty({ description: "Unit price in ZAR" })
  @Column({
    name: "unit_price",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  unitPrice: number;

  @ApiProperty({ description: "Discount percentage" })
  @Column({
    name: "discount_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercent: number;

  @ApiProperty({ description: "Line total in ZAR" })
  @Column({
    name: "line_total",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  lineTotal: number;

  @ApiProperty({ description: "Lead time in days" })
  @Column({ name: "lead_time_days", type: "int", nullable: true })
  leadTimeDays: number | null;

  @ApiProperty({ description: "Item-specific notes" })
  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @ApiProperty({ description: "Technical specifications as JSON" })
  @Column({ name: "specifications", type: "jsonb", nullable: true })
  specifications: Record<string, any> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
