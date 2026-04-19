import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

@Entity("qcp_customer_preferences")
@Unique(["companyId", "customerName", "planType"])
export class QcpCustomerPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "customer_name", type: "varchar", length: 255 })
  customerName: string;

  @Column({ name: "customer_email", type: "varchar", length: 255, nullable: true })
  customerEmail: string | null;

  @Column({ name: "plan_type", type: "varchar", length: 30 })
  planType: string;

  @Column({ name: "intervention_defaults", type: "jsonb", nullable: true })
  interventionDefaults: Record<number, string> | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
