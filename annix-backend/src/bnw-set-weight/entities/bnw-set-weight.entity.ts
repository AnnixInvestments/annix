import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('bnw_set_weights')
@Index(['pressure_class', 'nominal_bore_mm'], { unique: true })
export class BnwSetWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  pressure_class: string;

  @Column({ type: 'integer' })
  nominal_bore_mm: number;

  @Column({ type: 'varchar', length: 50 })
  bolt_size: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  weight_per_hole_kg: number;

  @Column({ type: 'integer' })
  num_holes: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
