import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";

@Entity("cv_assistant_profiles")
@Index(["userId"], { unique: true })
export class CvAssistantProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "match_alert_threshold", type: "int", default: 80 })
  matchAlertThreshold: number;

  @Column({ name: "digest_enabled", type: "boolean", default: true })
  digestEnabled: boolean;

  @Column({ name: "push_enabled", type: "boolean", default: false })
  pushEnabled: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
