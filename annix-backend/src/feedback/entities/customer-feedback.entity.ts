import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CustomerProfile } from "../../customer/entities/customer-profile.entity";

export type FeedbackSource = "text" | "voice";

@Entity("customer_feedback")
export class CustomerFeedback {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customer_profile_id" })
  customerProfile: CustomerProfile;

  @Column({ name: "customer_profile_id" })
  customerProfileId: number;

  @Column({ name: "github_issue_number", type: "int", nullable: true })
  githubIssueNumber: number | null;

  @Column({ type: "text" })
  content: string;

  @Column({ length: 10, default: "text" })
  source: FeedbackSource;

  @Column({ name: "page_url", length: 500, nullable: true })
  pageUrl: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
