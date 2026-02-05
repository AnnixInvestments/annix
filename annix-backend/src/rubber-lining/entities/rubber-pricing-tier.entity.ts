import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rubber_pricing_tier')
export class RubberPricingTier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'firebase_uid', type: 'varchar', length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({
    name: 'pricing_factor',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  pricingFactor: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
