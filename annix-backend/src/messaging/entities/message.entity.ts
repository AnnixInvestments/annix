import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Conversation } from './conversation.entity';
import { MessageAttachment } from './message-attachment.entity';
import { MessageReadReceipt } from './message-read-receipt.entity';
import { MessageType } from './messaging.enums';

@Entity('message')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversation, (c) => c.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'conversation_id' })
  conversationId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_id' })
  senderId: number;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'parent_message_id' })
  parentMessage: Message | null;

  @Column({ name: 'parent_message_id', nullable: true })
  parentMessageId: number | null;

  @Column({ name: 'sent_at', type: 'timestamp', default: () => 'now()' })
  sentAt: Date;

  @Column({ name: 'edited_at', type: 'timestamp', nullable: true })
  editedAt: Date | null;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @OneToMany(() => MessageAttachment, (a) => a.message)
  attachments: MessageAttachment[];

  @OneToMany(() => MessageReadReceipt, (r) => r.message)
  readReceipts: MessageReadReceipt[];

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
