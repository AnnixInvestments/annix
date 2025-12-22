import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CustomerProfile } from './customer-profile.entity';

@Entity('customer_companies')
export class CustomerCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'legal_name', length: 255 })
  legalName: string;

  @Column({ name: 'trading_name', length: 255, nullable: true })
  tradingName: string;

  @Column({ name: 'registration_number', length: 50, unique: true })
  registrationNumber: string;

  @Column({ name: 'vat_number', length: 50, nullable: true })
  vatNumber: string;

  @Column({ name: 'industry', length: 100, nullable: true })
  industry: string;

  @Column({ name: 'company_size', length: 50, nullable: true })
  companySize: string; // 'micro', 'small', 'medium', 'large', 'enterprise'

  // Address fields
  @Column({ name: 'street_address', type: 'text' })
  streetAddress: string;

  @Column({ name: 'city', length: 100 })
  city: string;

  @Column({ name: 'province_state', length: 100 })
  provinceState: string;

  @Column({ name: 'postal_code', length: 20 })
  postalCode: string;

  @Column({ name: 'country', length: 100, default: 'South Africa' })
  country: string;

  // Contact fields
  @Column({ name: 'primary_phone', length: 30 })
  primaryPhone: string;

  @Column({ name: 'fax_number', length: 30, nullable: true })
  faxNumber: string;

  @Column({ name: 'general_email', length: 255, nullable: true })
  generalEmail: string;

  @Column({ name: 'website', length: 255, nullable: true })
  website: string;

  @OneToMany(() => CustomerProfile, (profile) => profile.company)
  profiles: CustomerProfile[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
