import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CvAssistantCompany } from "./cv-assistant-company.entity";
import { CvAssistantUser } from "./cv-assistant-user.entity";

@Entity("cv_assistant_push_subscriptions")
export class CvPushSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CvAssistantUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: CvAssistantUser;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => CvAssistantCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: CvAssistantCompany;

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
