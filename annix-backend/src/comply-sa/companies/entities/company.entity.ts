import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ComplySaApiKey } from "../../api-keys/entities/api-key.entity";
import { ComplySaAuditLog } from "../../compliance/entities/audit-log.entity";
import { ComplySaComplianceStatus } from "../../compliance/entities/compliance-status.entity";
import { ComplySaDocument } from "../../comply-documents/entities/document.entity";
import { ComplySaSageConnection } from "../../comply-integrations/sage/sage-connection.entity";
import { ComplySaNotification } from "../../comply-notifications/entities/notification.entity";
import { ComplySaSubscription } from "../../subscriptions/entities/subscription.entity";
import { ComplySaUser } from "./user.entity";

@Entity("comply_sa_companies")
export class ComplySaCompany {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ name: "registration_number", type: "varchar", length: 50, nullable: true })
  registrationNumber!: string | null;

  @Column({ name: "trading_name", type: "varchar", length: 255, nullable: true })
  tradingName!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  industry!: string | null;

  @Column({ name: "sector_code", type: "varchar", length: 20, nullable: true })
  sectorCode!: string | null;

  @Column({ name: "employee_count", type: "int", default: 0 })
  employeeCount!: number;

  @Column({ name: "annual_turnover", type: "decimal", precision: 14, scale: 2, nullable: true })
  annualTurnover!: string | null;

  @Column({ name: "vat_registered", type: "boolean", default: false })
  vatRegistered!: boolean;

  @Column({ name: "vat_number", type: "varchar", length: 20, nullable: true })
  vatNumber!: string | null;

  @Column({ name: "vat_submission_cycle", type: "varchar", length: 10, nullable: true })
  vatSubmissionCycle!: "odd" | "even" | null;

  @Column({ name: "imports_exports", type: "boolean", default: false })
  importsExports!: boolean;

  @Column({ name: "handles_personal_data", type: "boolean", default: false })
  handlesPersonalData!: boolean;

  @Column({ name: "has_payroll", type: "boolean", default: false })
  hasPayroll!: boolean;

  @Column({ name: "registration_date", type: "varchar", length: 50, nullable: true })
  registrationDate!: string | null;

  @Column({ name: "financial_year_end_month", type: "int", nullable: true })
  financialYearEndMonth!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  municipality!: string | null;

  @Column({ name: "entity_type", type: "varchar", length: 20, default: "company" })
  entityType!: string;

  @Column({ name: "compliance_areas", type: "jsonb", nullable: true })
  complianceAreas!: string[] | null;

  @Column({ name: "id_number", type: "varchar", length: 20, nullable: true })
  idNumber!: string | null;

  @Column({ name: "passport_number", type: "varchar", length: 50, nullable: true })
  passportNumber!: string | null;

  @Column({ name: "passport_country", type: "varchar", length: 100, nullable: true })
  passportCountry!: string | null;

  @Column({ name: "sars_tax_reference", type: "varchar", length: 30, nullable: true })
  sarsTaxReference!: string | null;

  @Column({ name: "date_of_birth", type: "varchar", length: 20, nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone!: string | null;

  @Column({ name: "trust_registration_number", type: "varchar", length: 50, nullable: true })
  trustRegistrationNumber!: string | null;

  @Column({ name: "masters_office", type: "varchar", length: 100, nullable: true })
  mastersOffice!: string | null;

  @Column({ name: "trustee_count", type: "int", nullable: true })
  trusteeCount!: number | null;

  @Column({ name: "employee_count_range", type: "varchar", length: 20, nullable: true })
  employeeCountRange!: string | null;

  @Column({ name: "profile_complete", type: "boolean", default: false })
  profileComplete!: boolean;

  @Column({ name: "business_address", type: "text", nullable: true })
  businessAddress!: string | null;

  @Column({ name: "subscription_tier", type: "varchar", length: 20, default: "free" })
  subscriptionTier!: string;

  @Column({ name: "subscription_status", type: "varchar", length: 20, default: "trial" })
  subscriptionStatus!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(
    () => ComplySaUser,
    (user) => user.company,
  )
  users!: ComplySaUser[];

  @OneToMany(
    () => ComplySaComplianceStatus,
    (status) => status.company,
  )
  complianceStatuses!: ComplySaComplianceStatus[];

  @OneToMany(
    () => ComplySaDocument,
    (doc) => doc.company,
  )
  documents!: ComplySaDocument[];

  @OneToMany(
    () => ComplySaSubscription,
    (subscription) => subscription.company,
  )
  subscriptions!: ComplySaSubscription[];

  @OneToMany(
    () => ComplySaApiKey,
    (apiKey) => apiKey.company,
  )
  apiKeys!: ComplySaApiKey[];

  @OneToMany(
    () => ComplySaNotification,
    (notification) => notification.company,
  )
  notifications!: ComplySaNotification[];

  @OneToMany(
    () => ComplySaAuditLog,
    (auditLog) => auditLog.company,
  )
  auditLogs!: ComplySaAuditLog[];

  @OneToMany(
    () => ComplySaSageConnection,
    (sageConnection) => sageConnection.company,
  )
  sageConnections!: ComplySaSageConnection[];
}
