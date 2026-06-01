import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("cv_assistant_usage_counters")
@Index(["subjectId", "operation", "monthKey"], { unique: true })
export class SeekerUsageCounter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "subject_id", type: "varchar", length: 255 })
  subjectId: string;

  @Column({ name: "operation", type: "varchar", length: 32 })
  operation: string;

  @Column({ name: "month_key", type: "varchar", length: 7 })
  monthKey: string;

  @Column({ name: "count", type: "int", default: 0 })
  count: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
