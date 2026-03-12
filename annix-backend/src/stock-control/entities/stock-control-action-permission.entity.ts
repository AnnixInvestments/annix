import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("stock_control_action_permissions")
export class StockControlActionPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @Column({ name: "action_key", type: "varchar", length: 60 })
  actionKey: string;

  @Column({ type: "varchar", length: 30 })
  role: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
