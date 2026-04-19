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
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
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

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_user_id" })
  unifiedUser?: User | null;

  @Column({ name: "unified_user_id", nullable: true })
  unifiedUserId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
