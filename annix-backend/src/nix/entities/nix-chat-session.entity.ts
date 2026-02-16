import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Rfq } from '../../rfq/entities/rfq.entity';

@Entity('nix_chat_sessions')
export class NixChatSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'rfq_id', nullable: true })
  rfqId: number;

  @ManyToOne(() => Rfq, { nullable: true })
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;

  @Column({ type: 'jsonb', name: 'conversation_history', default: [] })
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;

  @Column({ type: 'jsonb', name: 'user_preferences', default: {} })
  userPreferences: {
    preferredMaterials?: string[];
    preferredSchedules?: string[];
    preferredStandards?: string[];
    commonFlangeRatings?: string[];
    unitPreference?: 'metric' | 'imperial';
    learningEnabled?: boolean;
  };

  @Column({ type: 'jsonb', name: 'session_context', default: {} })
  sessionContext: {
    currentRfqItems?: any[];
    lastValidationIssues?: any[];
    extractionHistory?: number[];
    recentCorrections?: Array<{
      extractedValue: string;
      correctedValue: string;
      fieldType: string;
    }>;
  };

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_interaction_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastInteractionAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
