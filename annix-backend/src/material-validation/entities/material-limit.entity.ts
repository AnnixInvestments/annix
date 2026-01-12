import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SteelSpecification } from '../../steel-specification/entities/steel-specification.entity';

@Entity('material_limits')
@Index(['steel_spec_name'])
export class MaterialLimit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  steel_specification_id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  steel_spec_name: string;

  @Column({ type: 'integer' })
  min_temperature_celsius: number;

  @Column({ type: 'integer' })
  max_temperature_celsius: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  max_pressure_bar: number;

  @Column({ type: 'varchar', length: 100 })
  material_type: string;

  @Column({ type: 'boolean', default: false })
  recommended_for_sour_service: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => SteelSpecification, { nullable: true })
  @JoinColumn({ name: 'steel_specification_id' })
  steelSpecification: SteelSpecification;
}
