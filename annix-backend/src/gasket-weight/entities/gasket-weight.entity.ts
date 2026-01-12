import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('gasket_weights')
@Index(['gasket_type', 'nominal_bore_mm'])
export class GasketWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  gasket_type: string; // 'ASBESTOS', 'GRAPHITE', 'PTFE', 'RUBBER'

  @Column({ type: 'integer' })
  nominal_bore_mm: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  weight_kg: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
