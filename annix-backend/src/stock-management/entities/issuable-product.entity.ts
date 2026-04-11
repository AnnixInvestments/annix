import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { ConsumableProduct } from "./consumable-product.entity";
import { PaintProduct } from "./paint-product.entity";
import { ProductCategory } from "./product-category.entity";
import { RubberOffcutStock } from "./rubber-offcut-stock.entity";
import { RubberRoll } from "./rubber-roll.entity";
import { SolutionProduct } from "./solution-product.entity";

export type IssuableProductType =
  | "consumable"
  | "paint"
  | "rubber_roll"
  | "rubber_offcut"
  | "solution";

@Entity("sm_issuable_product")
@Unique(["companyId", "sku"])
export class IssuableProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "product_type", type: "varchar", length: 32 })
  productType: IssuableProductType;

  @Column({ name: "sku", type: "varchar", length: 100 })
  sku: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @ManyToOne(() => ProductCategory, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "category_id" })
  category: ProductCategory | null;

  @Column({ name: "category_id", type: "integer", nullable: true })
  categoryId: number | null;

  @Column({ name: "unit_of_measure", type: "varchar", length: 50, default: "each" })
  unitOfMeasure: string;

  @Column({
    name: "cost_per_unit",
    type: "numeric",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value === null ? 0 : Number(value)),
    },
  })
  costPerUnit: number;

  @Column({
    name: "quantity",
    type: "numeric",
    precision: 14,
    scale: 4,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value === null ? 0 : Number(value)),
    },
  })
  quantity: number;

  @Column({
    name: "min_stock_level",
    type: "numeric",
    precision: 14,
    scale: 4,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value === null ? 0 : Number(value)),
    },
  })
  minStockLevel: number;

  @Column({ name: "location_id", type: "integer", nullable: true })
  locationId: number | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "active", type: "boolean", default: true })
  active: boolean;

  @Column({ name: "legacy_stock_item_id", type: "integer", nullable: true })
  legacyStockItemId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToOne(
    () => ConsumableProduct,
    (child) => child.product,
  )
  consumable?: ConsumableProduct | null;

  @OneToOne(
    () => PaintProduct,
    (child) => child.product,
  )
  paint?: PaintProduct | null;

  @OneToOne(
    () => RubberRoll,
    (child) => child.product,
  )
  rubberRoll?: RubberRoll | null;

  @OneToOne(
    () => RubberOffcutStock,
    (child) => child.product,
  )
  rubberOffcut?: RubberOffcutStock | null;

  @OneToOne(
    () => SolutionProduct,
    (child) => child.product,
  )
  solution?: SolutionProduct | null;
}
