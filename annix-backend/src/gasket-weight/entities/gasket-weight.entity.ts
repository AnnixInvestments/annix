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
  gasket_type: string;

  @Column({ type: 'integer' })
  nominal_bore_mm: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  weight_kg: number;

  @Column({ type: 'float', nullable: true })
  inner_diameter_mm: number | null;

  @Column({ type: 'float', nullable: true })
  outer_diameter_mm: number | null;

  @Column({ type: 'float', nullable: true })
  thickness_mm: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  flange_standard: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  pressure_class: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  material: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
