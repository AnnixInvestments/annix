import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ResponseRating } from './messaging.enums';

@Entity('conversation_response_metric')
export class ConversationResponseMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'conversation_id' })
  conversationId: number;

  @ManyToOne(() => Message)
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ name: 'message_id' })
  messageId: number;

  @ManyToOne(() => Message)
  @JoinColumn({ name: 'response_message_id' })
  responseMessage: Message;

  @Column({ name: 'response_message_id' })
  responseMessageId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'responder_id' })
  responder: User;

  @Column({ name: 'responder_id' })
  responderId: number;

  @Column({ name: 'response_time_minutes' })
  responseTimeMinutes: number;

  @Column({ name: 'within_sla', default: false })
  withinSla: boolean;

  @Column({
    name: 'rating',
    type: 'enum',
    enum: ResponseRating,
  })
  rating: ResponseRating;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
