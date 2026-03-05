import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("stock_control_rbac_config")
export class StockControlRbacConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @Column({ name: "nav_key", type: "varchar", length: 50 })
  navKey: string;

  @Column({ type: "varchar", length: 30 })
  role: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
