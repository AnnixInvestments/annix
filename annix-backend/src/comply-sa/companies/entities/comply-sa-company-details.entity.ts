import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../../platform/entities/company.entity";

@Entity("comply_sa_company_details")
@Index(["companyId"], { unique: true })
export class ComplySaCompanyDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "entity_type", type: "varchar", length: 20, default: "company" })
  entityType: string;

  @Column({ name: "employee_count", type: "int", default: 0 })
  employeeCount: number;

  @Column({ name: "employee_count_range", type: "varchar", length: 20, nullable: true })
  employeeCountRange: string | null;

  @Column({ name: "annual_turnover", type: "decimal", precision: 14, scale: 2, nullable: true })
  annualTurnover: number | null;

  @Column({ name: "financial_year_end_month", type: "int", nullable: true })
  financialYearEndMonth: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  municipality: string | null;

  @Column({ name: "sector_code", type: "varchar", length: 20, nullable: true })
  sectorCode: string | null;

  @Column({ name: "compliance_areas", type: "jsonb", nullable: true })
  complianceAreas: Record<string, unknown> | null;

  @Column({ name: "profile_complete", type: "boolean", default: false })
  profileComplete: boolean;

  @Column({ name: "subscription_tier", type: "varchar", length: 20, default: "free" })
  subscriptionTier: string;

  @Column({ name: "subscription_status", type: "varchar", length: 20, default: "trial" })
  subscriptionStatus: string;

  @Column({ name: "imports_exports", type: "boolean", default: false })
  importsExports: boolean;

  @Column({ name: "handles_personal_data", type: "boolean", default: false })
  handlesPersonalData: boolean;

  @Column({ name: "has_payroll", type: "boolean", default: false })
  hasPayroll: boolean;

  @Column({ name: "vat_registered", type: "boolean", default: false })
  vatRegistered: boolean;

  @Column({ name: "vat_submission_cycle", type: "varchar", length: 10, nullable: true })
  vatSubmissionCycle: string | null;

  @Column({ name: "registration_date", type: "varchar", length: 50, nullable: true })
  registrationDate: string | null;

  @Column({ name: "business_address", type: "text", nullable: true })
  businessAddress: string | null;

  @Column({ name: "id_number", type: "varchar", length: 255, nullable: true })
  idNumber: string | null;

  @Column({ name: "passport_number", type: "varchar", length: 255, nullable: true })
  passportNumber: string | null;

  @Column({ name: "passport_country", type: "varchar", length: 100, nullable: true })
  passportCountry: string | null;

  @Column({ name: "sars_tax_reference", type: "varchar", length: 255, nullable: true })
  sarsTaxReference: string | null;

  @Column({ name: "date_of_birth", type: "varchar", length: 255, nullable: true })
  dateOfBirth: string | null;

  @Column({ name: "trust_registration_number", type: "varchar", length: 50, nullable: true })
  trustRegistrationNumber: string | null;

  @Column({ name: "masters_office", type: "varchar", length: 100, nullable: true })
  mastersOffice: string | null;

  @Column({ name: "trustee_count", type: "int", nullable: true })
  trusteeCount: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
