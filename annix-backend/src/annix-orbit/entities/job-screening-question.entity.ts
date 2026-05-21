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

export enum ScreeningQuestionType {
  YES_NO = "yes_no",
  SHORT_TEXT = "short_text",
  MULTIPLE_CHOICE = "multiple_choice",
  NUMERIC = "numeric",
}

@Entity("cv_assistant_job_screening_questions")
export class JobScreeningQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobPosting,
    (jobPosting) => jobPosting.screeningQuestions,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_posting_id" })
  jobPosting: JobPosting;

  @Column({ name: "job_posting_id" })
  jobPostingId: number;

  @Column({ type: "text" })
  question: string;

  @Column({ name: "question_type", type: "varchar", length: 32 })
  questionType: ScreeningQuestionType;

  @Column({ type: "jsonb", nullable: true })
  options: string[] | null;

  @Column({ name: "disqualifying_answer", type: "text", nullable: true })
  disqualifyingAnswer: string | null;

  @Column({ type: "int", default: 5 })
  weight: number;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
