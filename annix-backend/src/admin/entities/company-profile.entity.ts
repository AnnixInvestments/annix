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

  @Column({ type: "varchar", length: 255 })
  legalName: string;

  @Column({ type: "varchar", length: 255 })
  tradingName: string;

  @Column({ type: "varchar", length: 100 })
  registrationNumber: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  vatNumber: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  entityType: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  streetAddress: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  postalCode: string | null;

  @Column({ type: "varchar", length: 100, default: "South Africa" })
  country: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  generalEmail: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  supportEmail: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  privacyEmail: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  websiteUrl: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  informationOfficerName: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  informationOfficerEmail: string | null;

  @Column({ type: "varchar", length: 255, default: "South Africa" })
  jurisdiction: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  primaryDomain: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  noReplyEmail: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  mailerName: string | null;

  @Column({ type: "jsonb", default: "[]" })
  directors: Director[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
