import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('retaining_ring_weights')
@Index(['nominal_bore_mm'], { unique: true })
export class RetainingRingWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  nominal_bore_mm: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  weight_kg: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
