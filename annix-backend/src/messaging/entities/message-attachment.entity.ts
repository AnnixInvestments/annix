import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Message } from "./message.entity";

@Entity("message_attachment")
export class MessageAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Message,
    (m) => m.attachments,
  )
  @JoinColumn({ name: "message_id" })
  message: Message;

  @Column({ name: "message_id" })
  messageId: number;

  @Column({ name: "file_name", length: 255 })
  fileName: string;

  @Column({ name: "file_path", length: 500 })
  filePath: string;

  @Column({ name: "file_size" })
  fileSize: number;

  @Column({ name: "mime_type", length: 100 })
  mimeType: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
