import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("stock_control_company_roles")
export class StockControlCompanyRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @Column({ type: "varchar", length: 30 })
  key: string;

  @Column({ type: "varchar", length: 50 })
  label: string;

  @Column({ name: "is_system", type: "boolean", default: false })
  isSystem: boolean;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;
  @Column({ name: "unified_company_id", type: "int", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
