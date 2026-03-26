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
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("dashboard_preferences")
@Unique(["userId"])
export class DashboardPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: StockControlUser;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "pinned_widgets", type: "jsonb", default: "[]" })
  pinnedWidgets: string[];

  @Column({ name: "hidden_widgets", type: "jsonb", default: "[]" })
  hiddenWidgets: string[];

  @Column({ name: "widget_order", type: "jsonb", default: "[]" })
  widgetOrder: string[];

  @Column({ name: "view_override", type: "varchar", length: 50, nullable: true })
  viewOverride: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
