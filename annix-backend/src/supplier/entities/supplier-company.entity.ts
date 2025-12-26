import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SupplierProfile } from './supplier-profile.entity';

@Entity('supplier_companies')
export class SupplierCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'legal_name', length: 255 })
  legalName: string;

  @Column({ name: 'trading_name', length: 255, nullable: true })
  tradingName: string;

  @Column({ name: 'registration_number', length: 50, unique: true })
  registrationNumber: string;

  @Column({ name: 'tax_number', length: 50, nullable: true })
  taxNumber: string;

  @Column({ name: 'vat_number', length: 50, nullable: true })
  vatNumber: string;

  // Address fields
  @Column({ name: 'street_address', type: 'text' })
  streetAddress: string;

  @Column({ name: 'address_line_2', type: 'text', nullable: true })
  addressLine2: string;

  @Column({ name: 'city', length: 100 })
  city: string;

  @Column({ name: 'province_state', length: 100 })
  provinceState: string;

  @Column({ name: 'postal_code', length: 20 })
  postalCode: string;

  @Column({ name: 'country', length: 100, default: 'South Africa' })
  country: string;

  // Primary contact fields
  @Column({ name: 'primary_contact_name', length: 200 })
  primaryContactName: string;

  @Column({ name: 'primary_contact_email', length: 255 })
  primaryContactEmail: string;

  @Column({ name: 'primary_contact_phone', length: 30 })
  primaryContactPhone: string;

  // General contact fields
  @Column({ name: 'primary_phone', length: 30, nullable: true })
  primaryPhone: string;

  @Column({ name: 'fax_number', length: 30, nullable: true })
  faxNumber: string;

  @Column({ name: 'general_email', length: 255, nullable: true })
  generalEmail: string;

  @Column({ name: 'website', length: 255, nullable: true })
  website: string;

  // Business details
  @Column({ name: 'operational_regions', type: 'jsonb', default: '[]' })
  operationalRegions: string[];

  @Column({ name: 'industry_type', length: 100, nullable: true })
  industryType: string;

  @Column({ name: 'company_size', length: 50, nullable: true })
  companySize: string;

  // BEE (Broad-Based Black Economic Empowerment) Rating
  @Column({ name: 'bee_level', type: 'int', nullable: true })
  beeLevel: number; // 1-8, or null if not applicable

  @Column({ name: 'bee_certificate_expiry', type: 'date', nullable: true })
  beeCertificateExpiry: Date;

  @Column({ name: 'bee_verification_agency', length: 255, nullable: true })
  beeVerificationAgency: string;

  @Column({ name: 'is_exempt_micro_enterprise', type: 'boolean', default: false })
  isExemptMicroEnterprise: boolean;

  @OneToMany(() => SupplierProfile, (profile) => profile.company)
  profiles: SupplierProfile[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
