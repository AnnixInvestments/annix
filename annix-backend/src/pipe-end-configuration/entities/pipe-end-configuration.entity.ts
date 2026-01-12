import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
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

  // Item type applicability
  @Column({ type: 'boolean', default: true })
  applies_to_pipe: boolean;

  @Column({ type: 'boolean', default: true })
  applies_to_bend: boolean;

  @Column({ type: 'boolean', default: true })
  applies_to_fitting: boolean;

  // Tack weld configuration
  @Column({ type: 'boolean', default: false })
  has_tack_welds: boolean;

  @Column({ type: 'integer', default: 0 })
  tack_weld_count_per_flange: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tack_weld_length_mm: number;

  // Flange configuration (end 1 = inlet, end 2 = outlet, end 3 = branch/stub)
  @Column({ type: 'boolean', default: false })
  has_fixed_flange_end1: boolean;

  @Column({ type: 'boolean', default: false })
  has_fixed_flange_end2: boolean;

  @Column({ type: 'boolean', default: false })
  has_fixed_flange_end3: boolean;

  @Column({ type: 'boolean', default: false })
  has_loose_flange_end1: boolean;

  @Column({ type: 'boolean', default: false })
  has_loose_flange_end2: boolean;

  @Column({ type: 'boolean', default: false })
  has_loose_flange_end3: boolean;

  @Column({ type: 'boolean', default: false })
  has_rotating_flange_end1: boolean;

  @Column({ type: 'boolean', default: false })
  has_rotating_flange_end2: boolean;

  @Column({ type: 'boolean', default: false })
  has_rotating_flange_end3: boolean;

  // Computed counts
  @Column({ type: 'integer', default: 0 })
  total_flanges: number;

  @Column({ type: 'integer', default: 0 })
  bolt_sets_per_config: number;

  // Stub flange code formatting (for fittings)
  @Column({ type: 'varchar', length: 50, nullable: true })
  stub_flange_code: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => WeldType, { nullable: true })
  @JoinColumn({ name: 'weld_type_id' })
  weldType: WeldType;
}
