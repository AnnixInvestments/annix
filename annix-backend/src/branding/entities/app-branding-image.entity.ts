import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("app_branding_images")
@Index("idx_app_branding_images_brand", ["brandCode"])
export class AppBrandingImage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "brand_code", type: "varchar", length: 64 })
  brandCode: string;

  @Column({ type: "varchar", length: 200, default: "" })
  label: string;

  @Column({ type: "varchar", length: 500 })
  path: string;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
