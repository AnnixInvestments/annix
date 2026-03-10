import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum ItemReleaseResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface ReleaseLineItem {
  itemCode: string;
  description: string;
  jtNumber: string | null;
  rubberSpec: string | null;
  paintingSpec: string | null;
  quantity: number;
  result: ItemReleaseResult;
}

export interface ReleasePartySignOff {
  name: string | null;
  date: string | null;
  signatureUrl: string | null;
}

@Entity("qc_items_releases")
export class QcItemsRelease {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "items", type: "jsonb" })
  items: ReleaseLineItem[];

  @Column({ name: "total_quantity", type: "numeric", precision: 12, scale: 2, default: 0 })
  totalQuantity: number;

  @Column({ name: "checked_by_name", type: "varchar", length: 255, nullable: true })
  checkedByName: string | null;

  @Column({ name: "checked_by_date", type: "date", nullable: true })
  checkedByDate: string | null;

  @Column({ name: "pls_sign_off", type: "jsonb", default: "{}" })
  plsSignOff: ReleasePartySignOff;

  @Column({ name: "mps_sign_off", type: "jsonb", default: "{}" })
  mpsSignOff: ReleasePartySignOff;

  @Column({ name: "client_sign_off", type: "jsonb", default: "{}" })
  clientSignOff: ReleasePartySignOff;

  @Column({ name: "comments", type: "text", nullable: true })
  comments: string | null;

  @Column({ name: "created_by_name", type: "varchar", length: 255 })
  createdByName: string;

  @Column({ name: "created_by_id", type: "integer", nullable: true })
  createdById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
