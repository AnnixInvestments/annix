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

  @Column({ name: "smtp_host", type: "varchar", length: 255, nullable: true })
  smtpHost: string | null;

  @Column({ name: "smtp_port", type: "int", nullable: true })
  smtpPort: number | null;

  @Column({ name: "smtp_user", type: "varchar", length: 255, nullable: true })
  smtpUser: string | null;

  @Column({ name: "smtp_pass_encrypted", type: "bytea", nullable: true })
  smtpPassEncrypted: Buffer | null;

  @Column({ name: "smtp_from_name", type: "varchar", length: 255, nullable: true })
  smtpFromName: string | null;

  @Column({ name: "smtp_from_email", type: "varchar", length: 255, nullable: true })
  smtpFromEmail: string | null;

  @Column({ name: "notification_emails", type: "jsonb", default: "[]" })
  notificationEmails: string[];

  @Column({ name: "piping_loss_factor_pct", type: "int", default: 45 })
  pipingLossFactorPct: number;

  @Column({ name: "flat_plate_loss_factor_pct", type: "int", default: 20 })
  flatPlateLossFactorPct: number;

  @Column({ name: "structural_steel_loss_factor_pct", type: "int", default: 30 })
  structuralSteelLossFactorPct: number;

  @Column({ name: "sage_username", type: "varchar", length: 255, nullable: true })
  sageUsername: string | null;

  @Column({ name: "sage_pass_encrypted", type: "bytea", nullable: true })
  sagePassEncrypted: Buffer | null;

  @Column({ name: "sage_company_id", type: "int", nullable: true })
  sageCompanyId: number | null;

  @Column({ name: "sage_company_name", type: "varchar", length: 255, nullable: true })
  sageCompanyName: string | null;

  @Column({ name: "sage_connected_at", type: "timestamp", nullable: true })
  sageConnectedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
