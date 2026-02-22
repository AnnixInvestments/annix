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

  @Column({ name: "hero_image_url", type: "varchar", length: 500, nullable: true })
  heroImageUrl: string | null;

  @Column({ name: "registration_number", type: "varchar", length: 50, nullable: true })
  registrationNumber: string | null;

  @Column({ name: "vat_number", type: "varchar", length: 50, nullable: true })
  vatNumber: string | null;

  @Column({ name: "street_address", type: "varchar", length: 500, nullable: true })
  streetAddress: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  province: string | null;

  @Column({ name: "postal_code", type: "varchar", length: 10, nullable: true })
  postalCode: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
