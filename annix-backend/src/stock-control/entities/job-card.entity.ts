import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DispatchScan } from "./dispatch-scan.entity";
import { JobCardApproval } from "./job-card-approval.entity";
import { JobCardAttachment } from "./job-card-attachment.entity";
import { JobCardDocument } from "./job-card-document.entity";
import { JobCardLineItem } from "./job-card-line-item.entity";
import { JobCardVersion } from "./job-card-version.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum JobCardStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum JobCardWorkflowStatus {
  DRAFT = "draft",
  DOCUMENT_UPLOADED = "document_uploaded",
  ADMIN_APPROVED = "admin_approved",
  MANAGER_APPROVED = "manager_approved",
  REQUISITION_SENT = "requisition_sent",
  STOCK_ALLOCATED = "stock_allocated",
  MANAGER_FINAL = "manager_final",
  READY_FOR_DISPATCH = "ready_for_dispatch",
  DISPATCHED = "dispatched",
}

@Entity("job_cards")
export class JobCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "job_number", type: "varchar", length: 100 })
  jobNumber: string;

  @Column({ name: "jc_number", type: "varchar", length: 100, nullable: true })
  jcNumber: string | null;

  @Column({ name: "page_number", type: "varchar", length: 50, nullable: true })
  pageNumber: string | null;

  @Column({ name: "job_name", type: "varchar", length: 255 })
  jobName: string;

  @Column({ name: "customer_name", type: "varchar", length: 255, nullable: true })
  customerName: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "po_number", type: "varchar", length: 100, nullable: true })
  poNumber: string | null;

  @Column({ name: "site_location", type: "varchar", length: 255, nullable: true })
  siteLocation: string | null;

  @Column({ name: "contact_person", type: "varchar", length: 255, nullable: true })
  contactPerson: string | null;

  @Column({ name: "due_date", type: "varchar", length: 100, nullable: true })
  dueDate: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference: string | null;

  @Column({ name: "custom_fields", type: "jsonb", nullable: true })
  customFields: Record<string, string> | null;

  @Column({ type: "varchar", length: 50, default: JobCardStatus.DRAFT })
  status: JobCardStatus;

  @Column({ name: "workflow_status", type: "varchar", length: 50, default: JobCardWorkflowStatus.DRAFT })
  workflowStatus: JobCardWorkflowStatus;

  @Column({ name: "version_number", type: "integer", default: 1 })
  versionNumber: number;

  @Column({ name: "source_file_path", type: "varchar", length: 500, nullable: true })
  sourceFilePath: string | null;

  @Column({ name: "source_file_name", type: "varchar", length: 255, nullable: true })
  sourceFileName: string | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @OneToMany(
    () => StockAllocation,
    (allocation) => allocation.jobCard,
  )
  allocations: StockAllocation[];

  @OneToMany(
    () => JobCardLineItem,
    (li) => li.jobCard,
  )
  lineItems: JobCardLineItem[];

  @OneToMany(
    () => JobCardDocument,
    (doc) => doc.jobCard,
  )
  documents: JobCardDocument[];

  @OneToMany(
    () => JobCardApproval,
    (approval) => approval.jobCard,
  )
  approvals: JobCardApproval[];

  @OneToMany(
    () => DispatchScan,
    (scan) => scan.jobCard,
  )
  dispatchScans: DispatchScan[];

  @OneToMany(
    () => JobCardVersion,
    (version) => version.jobCard,
  )
  versions: JobCardVersion[];

  @OneToMany(
    () => JobCardAttachment,
    (attachment) => attachment.jobCard,
  )
  attachments: JobCardAttachment[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
