import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export type ProductCategoryType =
  | "consumable"
  | "paint"
  | "rubber_roll"
  | "rubber_offcut"
  | "solution";

@Entity("sm_product_category")
@Unique(["companyId", "productType", "slug"])
export class ProductCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "product_type", type: "varchar", length: 32 })
  productType: ProductCategoryType;

  @Column({ name: "slug", type: "varchar", length: 64 })
  slug: string;

  @Column({ name: "name", type: "varchar", length: 128 })
  name: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({ name: "sort_order", type: "integer", default: 100 })
  sortOrder: number;

  @Column({ name: "icon_key", type: "varchar", length: 64, nullable: true })
  iconKey: string | null;

  @Column({ name: "workflow_hints", type: "jsonb", default: () => "'{}'::jsonb" })
  workflowHints: Record<string, unknown>;

  @Column({ name: "active", type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
