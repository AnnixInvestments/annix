import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

export interface Director {
  name: string;
  title: string;
  email: string;
}

@Entity("admin_company_profile")
export class CompanyProfile {
  @PrimaryColumn({ type: "int", default: 1 })
  id: number;

  @Column({ name: "legal_name", type: "varchar", length: 255 })
  legalName: string;

  @Column({ name: "trading_name", type: "varchar", length: 255 })
  tradingName: string;

  @Column({ name: "registration_number", type: "varchar", length: 100 })
  registrationNumber: string;

  @Column({ name: "vat_number", type: "varchar", length: 50, nullable: true })
  vatNumber: string | null;

  @Column({ name: "entity_type", type: "varchar", length: 100, nullable: true })
  entityType: string | null;

  @Column({ name: "street_address", type: "varchar", length: 500, nullable: true })
  streetAddress: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province: string | null;

  @Column({ name: "postal_code", type: "varchar", length: 20, nullable: true })
  postalCode: string | null;

  @Column({ type: "varchar", length: 100, default: "South Africa" })
  country: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone: string | null;

  @Column({ name: "general_email", type: "varchar", length: 255, nullable: true })
  generalEmail: string | null;

  @Column({ name: "support_email", type: "varchar", length: 255, nullable: true })
  supportEmail: string | null;

  @Column({ name: "privacy_email", type: "varchar", length: 255, nullable: true })
  privacyEmail: string | null;

  @Column({ name: "website_url", type: "varchar", length: 255, nullable: true })
  websiteUrl: string | null;

  @Column({ name: "information_officer_name", type: "varchar", length: 255, nullable: true })
  informationOfficerName: string | null;

  @Column({ name: "information_officer_email", type: "varchar", length: 255, nullable: true })
  informationOfficerEmail: string | null;

  @Column({ type: "varchar", length: 255, default: "South Africa" })
  jurisdiction: string;

  @Column({ name: "primary_domain", type: "varchar", length: 255, nullable: true })
  primaryDomain: string | null;

  @Column({ name: "no_reply_email", type: "varchar", length: 255, nullable: true })
  noReplyEmail: string | null;

  @Column({ name: "mailer_name", type: "varchar", length: 255, nullable: true })
  mailerName: string | null;

  @Column({ type: "jsonb", default: "[]" })
  directors: Director[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
