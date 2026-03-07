import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("push_subscriptions")
export class PushSubscription {
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

  @Column({ type: "text", unique: true })
  endpoint: string;

  @Column({ name: "key_p256dh", type: "text" })
  keyP256dh: string;

  @Column({ name: "key_auth", type: "text" })
  keyAuth: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
