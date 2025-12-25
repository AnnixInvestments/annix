import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { HdpeFittingWeight } from './hdpe-fitting-weight.entity';

@Entity('hdpe_fitting_types')
export class HdpeFittingType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'num_buttwelds', type: 'int', default: 0 })
  numButtwelds: number; // Number of butt welds required

  @Column({ name: 'is_molded', type: 'boolean', default: false })
  isMolded: boolean; // Molded vs fabricated

  @Column({ name: 'is_fabricated', type: 'boolean', default: false })
  isFabricated: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string; // elbow, tee, reducer, cap, stub, etc.

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => HdpeFittingWeight, (weight) => weight.fittingType)
  weights: HdpeFittingWeight[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
