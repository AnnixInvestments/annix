import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerCompany } from './customer-company.entity';
import { CustomerProfile } from './customer-profile.entity';
import { SupplierProfile } from '../../supplier/entities/supplier-profile.entity';

export enum SupplierInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('supplier_invitations')
@Index(['token'], { unique: true })
export class SupplierInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerCompany)
  @JoinColumn({ name: 'customer_company_id' })
  customerCompany: CustomerCompany;

  @Column({ name: 'customer_company_id' })
  customerCompanyId: number;

  @ManyToOne(() => CustomerProfile)
  @JoinColumn({ name: 'invited_by' })
  invitedBy: CustomerProfile;

  @Column({ name: 'invited_by' })
  invitedById: number;

  @Column({ name: 'token', type: 'varchar', length: 100, unique: true })
  token: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'supplier_company_name', type: 'varchar', length: 255, nullable: true })
  supplierCompanyName: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SupplierInvitationStatus,
    default: SupplierInvitationStatus.PENDING,
  })
  status: SupplierInvitationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @ManyToOne(() => SupplierProfile, { nullable: true })
  @JoinColumn({ name: 'supplier_profile_id' })
  supplierProfile: SupplierProfile;

  @Column({ name: 'supplier_profile_id', nullable: true })
  supplierProfileId: number | null;

  @Column({ name: 'message', type: 'text', nullable: true })
  message: string | null;
}
