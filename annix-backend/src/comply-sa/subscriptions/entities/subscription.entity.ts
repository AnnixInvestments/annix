import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";

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

  @Column({ name: "trial_ends_at", type: "varchar", length: 50, nullable: true })
  trialEndsAt!: string | null;

  @Column({ name: "current_period_start", type: "varchar", length: 50, nullable: true })
  currentPeriodStart!: string | null;

  @Column({ name: "current_period_end", type: "varchar", length: 50, nullable: true })
  currentPeriodEnd!: string | null;

  @Column({ name: "paystack_customer_id", type: "varchar", length: 100, nullable: true })
  paystackCustomerId!: string | null;

  @Column({ name: "paystack_subscription_code", type: "varchar", length: 100, nullable: true })
  paystackSubscriptionCode!: string | null;

  @Column({ name: "cancelled_at", type: "varchar", length: 50, nullable: true })
  cancelledAt!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne(() => ComplySaCompany)
  @JoinColumn({ name: "company_id" })
  company!: ComplySaCompany;
}
