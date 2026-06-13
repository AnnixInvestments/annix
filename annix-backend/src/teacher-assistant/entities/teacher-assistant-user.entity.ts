import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("teacher_assistant_users")
export class TeacherAssistantUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255, name: "password_hash" })
  passwordHash!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "school_name" })
  schoolName!: string | null;

  // Core User anchor (issue #311 step 4.1). Links this standalone
  // Teacher Assistant account to a `teacher-assistant`-scoped row in
  // the universal `users` table so the identity is reconcilable and
  // RBAC-grantable. Nullable during the additive transition — login
  // still authenticates against this table, not the core user.
  @Column({ type: "int", nullable: true, name: "user_id" })
  userId!: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
