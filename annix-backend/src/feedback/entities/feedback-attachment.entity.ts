import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CustomerFeedback } from "./customer-feedback.entity";

@Entity("feedback_attachment")
export class FeedbackAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => CustomerFeedback,
    (f) => f.attachments,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "feedback_id" })
  feedback: CustomerFeedback;

  @Column({ name: "feedback_id" })
  feedbackId: number;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "file_size", type: "int" })
  fileSize: number;

  @Column({ name: "is_auto_screenshot", type: "boolean", default: false })
  isAutoScreenshot: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
