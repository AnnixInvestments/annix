import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FlangeStandard } from '../../flange-standard/entities/flange-standard.entity';

@Entity('flange_type_weights')
@Index(
  [
    'flange_standard_id',
    'pressure_class',
    'flange_type_code',
    'nominal_bore_mm',
  ],
  {
    unique: true,
  },
)
export class FlangeTypeWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  flange_standard_id: number | null;

  @ManyToOne(() => FlangeStandard, { nullable: true })
  @JoinColumn({ name: 'flange_standard_id' })
  flangeStandard: FlangeStandard | null;

  @Column({ type: 'varchar', length: 50 })
  pressure_class: string;

  @Column({ type: 'varchar', length: 20 })
  flange_type_code: string;

  @Column({ type: 'integer' })
  nominal_bore_mm: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  weight_kg: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
