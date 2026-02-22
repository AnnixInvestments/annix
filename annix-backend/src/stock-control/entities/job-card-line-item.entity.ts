import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("job_card_line_items")
export class JobCardLineItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @ManyToOne(
    () => JobCard,
    (jc) => jc.lineItems,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "item_code", type: "varchar", length: 100, nullable: true })
  itemCode: string | null;

  @Column({ name: "item_description", type: "text", nullable: true })
  itemDescription: string | null;

  @Column({ name: "item_no", type: "varchar", length: 100, nullable: true })
  itemNo: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, nullable: true })
  quantity: number | null;

  @Column({ name: "jt_no", type: "varchar", length: 100, nullable: true })
  jtNo: string | null;

  @Column({ name: "m2", type: "numeric", precision: 12, scale: 4, nullable: true })
  m2: number | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
