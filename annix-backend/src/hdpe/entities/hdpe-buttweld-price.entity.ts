import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('hdpe_buttweld_prices')
export class HdpeButtweldPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nominal_bore', type: 'int', unique: true })
  nominalBore: number; // DN in mm

  @Column({ name: 'price_per_weld', type: 'decimal', precision: 10, scale: 2 })
  pricePerWeld: number; // Price per butt weld

  @Column({ type: 'varchar', length: 3, default: 'ZAR' })
  currency: string;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
