import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';

@Entity('nix_user_preferences')
@Unique(['userId', 'preferenceKey'])
export class NixUserPreference {
  @ApiProperty({ description: 'Primary key' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ApiProperty({ description: 'Preference category' })
  @Column({ name: 'category', nullable: true })
  category?: string;

  @ApiProperty({ description: 'Preference key/identifier' })
  @Column({ name: 'preference_key' })
  preferenceKey: string;

  @ApiProperty({ description: 'Preference value' })
  @Column({ name: 'preference_value', type: 'text' })
  preferenceValue: string;

  @ApiProperty({ description: 'Additional preference data as JSON' })
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Number of times this preference was used' })
  @Column({ name: 'usage_count', default: 1 })
  usageCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
