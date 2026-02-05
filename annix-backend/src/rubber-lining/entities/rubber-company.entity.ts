import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RubberPricingTier } from './rubber-pricing-tier.entity';

@Entity('rubber_company')
export class RubberCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'firebase_uid', type: 'varchar', length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'code', type: 'varchar', length: 20, nullable: true })
  code: string | null;

  @Column({
    name: 'pricing_tier_firebase_uid',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  pricingTierFirebaseUid: string | null;

  @Column({ name: 'pricing_tier_id', type: 'int', nullable: true })
  pricingTierId: number | null;

  @ManyToOne(() => RubberPricingTier, { nullable: true })
  @JoinColumn({ name: 'pricing_tier_id' })
  pricingTier: RubberPricingTier | null;

  @Column({
    name: 'available_products',
    type: 'jsonb',
    default: '[]',
  })
  availableProducts: string[];

  @Column({ name: 'is_compound_owner', type: 'boolean', default: false })
  isCompoundOwner: boolean;

  @Column({ name: 'vat_number', type: 'varchar', length: 50, nullable: true })
  vatNumber: string | null;

  @Column({
    name: 'registration_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  registrationNumber: string | null;

  @Column({ name: 'address', type: 'jsonb', nullable: true })
  address: Record<string, string> | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
