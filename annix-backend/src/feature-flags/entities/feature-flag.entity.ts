import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('feature_flags')
@Unique(['flagKey'])
export class FeatureFlag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'flag_key', type: 'varchar', length: 100 })
  flagKey: string;

  @Column({ name: 'enabled', type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
