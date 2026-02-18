import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export interface TargetCustomerProfile {
  businessTypes?: string[];
  companySizes?: string[];
  decisionMakerTitles?: string[];
}

@Entity("annix_rep_rep_profiles")
export class RepProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id", unique: true })
  userId: number;

  @Column({ name: "industry", type: "varchar", length: 100 })
  industry: string;

  @Column({ name: "sub_industries", type: "simple-array" })
  subIndustries: string[];

  @Column({ name: "product_categories", type: "simple-array" })
  productCategories: string[];

  @Column({ name: "company_name", type: "varchar", length: 255, nullable: true })
  companyName: string | null;

  @Column({ name: "job_title", type: "varchar", length: 100, nullable: true })
  jobTitle: string | null;

  @Column({ name: "territory_description", type: "text", nullable: true })
  territoryDescription: string | null;

  @Column({
    name: "default_search_latitude",
    type: "decimal",
    precision: 10,
    scale: 7,
    nullable: true,
  })
  defaultSearchLatitude: number | null;

  @Column({
    name: "default_search_longitude",
    type: "decimal",
    precision: 10,
    scale: 7,
    nullable: true,
  })
  defaultSearchLongitude: number | null;

  @Column({ name: "default_search_radius_km", type: "int", default: 25 })
  defaultSearchRadiusKm: number;

  @Column({ name: "target_customer_profile", type: "json", nullable: true })
  targetCustomerProfile: TargetCustomerProfile | null;

  @Column({ name: "custom_search_terms", type: "simple-array", nullable: true })
  customSearchTerms: string[] | null;

  @Column({ name: "setup_completed", default: false })
  setupCompleted: boolean;

  @Column({ name: "setup_completed_at", type: "timestamp", nullable: true })
  setupCompletedAt: Date | null;

  @Column({ name: "default_buffer_before_minutes", type: "int", default: 15 })
  defaultBufferBeforeMinutes: number;

  @Column({ name: "default_buffer_after_minutes", type: "int", default: 15 })
  defaultBufferAfterMinutes: number;

  @Column({ name: "working_hours_start", type: "varchar", length: 5, default: "08:00" })
  workingHoursStart: string;

  @Column({ name: "working_hours_end", type: "varchar", length: 5, default: "17:00" })
  workingHoursEnd: string;

  @Column({ name: "working_days", type: "varchar", length: 20, default: "1,2,3,4,5" })
  workingDays: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
