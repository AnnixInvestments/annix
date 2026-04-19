import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CompanyModuleSubscription } from "./company-module-subscription.entity";
import { Contact } from "./contact.entity";

export enum CompanyType {
  MANUFACTURER = "MANUFACTURER",
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
  HYBRID = "HYBRID",
}

export enum BrandingType {
  ANNIX = "annix",
  CUSTOM = "custom",
}

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "company_type", type: "varchar", length: 20, default: CompanyType.MANUFACTURER })
  companyType: CompanyType;

  @Column({ name: "registration_number", type: "varchar", length: 50, nullable: true })
  registrationNumber: string | null;

  @Column({ name: "vat_number", type: "varchar", length: 50, nullable: true })
  vatNumber: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ name: "contact_person", type: "varchar", length: 200, nullable: true })
  contactPerson: string | null;

  @Column({ name: "street_address", type: "varchar", length: 500, nullable: true })
  streetAddress: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  province: string | null;

  @Column({ name: "postal_code", type: "varchar", length: 10, nullable: true })
  postalCode: string | null;

  @Column({ name: "address_jsonb", type: "jsonb", nullable: true })
  addressJsonb: Record<string, string> | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "website_url", type: "varchar", length: 500, nullable: true })
  websiteUrl: string | null;

  @Column({ name: "branding_type", type: "varchar", length: 20, default: BrandingType.ANNIX })
  brandingType: BrandingType;

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

  @Column({ name: "email_config", type: "jsonb", nullable: true })
  emailConfig: Record<string, string> | null;

  @Column({ name: "piping_loss_factor_pct", type: "int", default: 45 })
  pipingLossFactorPct: number;

  @Column({ name: "flat_plate_loss_factor_pct", type: "int", default: 20 })
  flatPlateLossFactorPct: number;

  @Column({ name: "structural_steel_loss_factor_pct", type: "int", default: 30 })
  structuralSteelLossFactorPct: number;

  @Column({ name: "qc_enabled", type: "boolean", default: true })
  qcEnabled: boolean;

  @Column({ name: "messaging_enabled", type: "boolean", default: false })
  messagingEnabled: boolean;

  @Column({ name: "staff_leave_enabled", type: "boolean", default: false })
  staffLeaveEnabled: boolean;

  @Column({ name: "workflow_enabled", type: "boolean", default: true })
  workflowEnabled: boolean;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, nullable: true })
  firebaseUid: string | null;

  @Column({ name: "trading_name", type: "varchar", length: 255, nullable: true })
  tradingName: string | null;

  @Column({ name: "legal_name", type: "varchar", length: 255, nullable: true })
  legalName: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  industry: string | null;

  @Column({ name: "company_size", type: "varchar", length: 50, nullable: true })
  companySize: string | null;

  @Column({ type: "varchar", length: 100, default: "South Africa" })
  country: string;

  @Column({ name: "currency_code", type: "varchar", length: 3, default: "ZAR" })
  currencyCode: string;

  @Column({ name: "bee_level", type: "int", nullable: true })
  beeLevel: number | null;

  @Column({ name: "bee_certificate_expiry", type: "date", nullable: true })
  beeCertificateExpiry: Date | null;

  @Column({ name: "bee_verification_agency", type: "varchar", length: 255, nullable: true })
  beeVerificationAgency: string | null;

  @Column({ name: "is_exempt_micro_enterprise", type: "boolean", default: false })
  isExemptMicroEnterprise: boolean;

  @Column({ name: "bee_expiry_notification_sent_at", type: "timestamptz", nullable: true })
  beeExpiryNotificationSentAt: Date | null;

  @Column({ name: "legacy_sc_company_id", type: "int", nullable: true })
  legacyScCompanyId: number | null;

  @Column({ name: "legacy_rubber_company_id", type: "int", nullable: true })
  legacyRubberCompanyId: number | null;

  @Column({ name: "legacy_comply_company_id", type: "int", nullable: true })
  legacyComplyCompanyId: number | null;

  @Column({ name: "legacy_cv_company_id", type: "int", nullable: true })
  legacyCvCompanyId: number | null;

  @OneToMany(
    () => CompanyModuleSubscription,
    (sub) => sub.company,
    { cascade: true },
  )
  moduleSubscriptions: CompanyModuleSubscription[];

  @OneToMany(
    () => Contact,
    (contact) => contact.company,
    { cascade: true },
  )
  contacts: Contact[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
