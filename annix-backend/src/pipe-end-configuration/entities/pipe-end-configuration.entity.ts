import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { WeldType } from '../../weld-type/entities/weld-type.entity';

@Entity('pipe_end_configurations')
export class PipeEndConfiguration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  config_code: string; // e.g. "PE", "FOE", "FBE", "FOE_LF", "FOE_RF", "2X_RF"

  @Column({ type: 'varchar', length: 100 })
  config_name: string; // e.g. "Plain ended", "Flanged both ends"

  @Column({ type: 'integer', default: 0 })
  weld_count: number; // Number of welds required

  @Column({ type: 'text', nullable: true })
  description: string; // Detailed description

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => WeldType, { nullable: true })
  @JoinColumn({ name: 'weld_type_id' })
  weldType: WeldType;
}