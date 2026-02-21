import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum BrandingType {
  ANNIX = "annix",
  CUSTOM = "custom",
}

@Entity("stock_control_companies")
export class StockControlCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "branding_type", type: "varchar", length: 20, default: BrandingType.ANNIX })
  brandingType: BrandingType;

  @Column({ name: "website_url", type: "varchar", length: 500, nullable: true })
  websiteUrl: string | null;

  @Column({ name: "branding_authorized", type: "boolean", default: false })
  brandingAuthorized: boolean;

  @Column({ name: "primary_color", type: "varchar", length: 20, nullable: true })
  primaryColor: string | null;

  @Column({ name: "accent_color", type: "varchar", length: 20, nullable: true })
  accentColor: string | null;

  @Column({ name: "logo_url", type: "varchar", length: 500, nullable: true })
  logoUrl: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
