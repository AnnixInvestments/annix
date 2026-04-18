import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../../platform/entities/company.entity";

@Entity("comply_sa_subscriptions")
export class ComplySaSubscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "company_id", type: "int", unique: true })
  companyId!: number;

  @Column({ type: "varchar", length: 20, default: "free" })
  tier!: string;

  @Column({ type: "varchar", length: 20, default: "trial" })
  status!: string;

  @Column({ name: "trial_ends_at", type: "timestamp", nullable: true })
  trialEndsAt!: Date | null;

  @Column({ name: "current_period_start", type: "timestamp", nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ name: "current_period_end", type: "timestamp", nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ name: "paystack_customer_id", type: "varchar", length: 100, nullable: true })
  paystackCustomerId!: string | null;

  @Column({ name: "paystack_subscription_code", type: "varchar", length: 100, nullable: true })
  paystackSubscriptionCode!: string | null;

  @Column({ name: "cancelled_at", type: "timestamp", nullable: true })
  cancelledAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne(() => Company, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company!: Company;
}
