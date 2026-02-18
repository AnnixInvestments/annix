import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum CustomFieldType {
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  SELECT = "select",
  MULTISELECT = "multiselect",
  BOOLEAN = "boolean",
}

@Entity("annix_rep_custom_field_definitions")
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: "field_key", length: 50 })
  fieldKey: string;

  @Column({
    name: "field_type",
    type: "enum",
    enum: CustomFieldType,
    default: CustomFieldType.TEXT,
  })
  fieldType: CustomFieldType;

  @Column({ name: "is_required", default: false })
  isRequired: boolean;

  @Column({ type: "simple-array", nullable: true })
  options: string[] | null;

  @Column({ name: "display_order", type: "integer", default: 0 })
  displayOrder: number;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
