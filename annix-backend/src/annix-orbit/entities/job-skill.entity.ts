import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { JobPosting } from "./job-posting.entity";

export enum SkillImportance {
  REQUIRED = "required",
  PREFERRED = "preferred",
}

export enum SkillProficiency {
  BASIC = "basic",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

@Entity("cv_assistant_job_skills")
export class JobSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobPosting,
    (jobPosting) => jobPosting.skills,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_posting_id" })
  jobPosting: JobPosting;

  @Column({ name: "job_posting_id" })
  jobPostingId: number;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "varchar", length: 16, default: SkillImportance.REQUIRED })
  importance: SkillImportance;

  @Column({ type: "varchar", length: 16, default: SkillProficiency.INTERMEDIATE })
  proficiency: SkillProficiency;

  @Column({ name: "years_experience", type: "int", nullable: true })
  yearsExperience: number | null;

  @Column({ name: "evidence_required", type: "text", nullable: true })
  evidenceRequired: string | null;

  @Column({ type: "int", default: 5 })
  weight: number;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
