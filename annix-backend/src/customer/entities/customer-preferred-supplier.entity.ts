import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerCompany } from './customer-company.entity';
import { CustomerProfile } from './customer-profile.entity';
import { SupplierProfile } from '../../supplier';

@Entity('customer_preferred_suppliers')
@Index(['customerCompanyId', 'supplierProfileId'], { unique: true })
export class CustomerPreferredSupplier {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerCompany)
  @JoinColumn({ name: 'customer_company_id' })
  customerCompany: CustomerCompany;

  @Column({ name: 'customer_company_id' })
  customerCompanyId: number;

  @ManyToOne(() => SupplierProfile, { nullable: true })
  @JoinColumn({ name: 'supplier_profile_id' })
  supplierProfile: SupplierProfile;

  @Column({ name: 'supplier_profile_id', nullable: true })
  supplierProfileId: number | null;

  // For suppliers not yet in system
  @Column({ name: 'supplier_name', type: 'varchar', length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: 'supplier_email', type: 'varchar', length: 255, nullable: true })
  supplierEmail: string | null;

  @ManyToOne(() => CustomerProfile)
  @JoinColumn({ name: 'added_by' })
  addedBy: CustomerProfile;

  @Column({ name: 'added_by' })
  addedById: number;

  @Column({ name: 'priority', default: 0 })
  priority: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
