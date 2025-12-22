import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierProfile } from './supplier-profile.entity';

@Entity('supplier_device_bindings')
export class SupplierDeviceBinding {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SupplierProfile, (profile) => profile.deviceBindings)
  @JoinColumn({ name: 'supplier_profile_id' })
  supplierProfile: SupplierProfile;

  @Column({ name: 'supplier_profile_id' })
  supplierProfileId: number;

  @Column({ name: 'device_fingerprint', length: 500 })
  deviceFingerprint: string;

  @Column({ name: 'is_primary', default: true })
  isPrimary: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'browser_info', type: 'jsonb', nullable: true })
  browserInfo: Record<string, any>;

  @Column({ name: 'registered_ip', length: 45 })
  registeredIp: string;

  @Column({ name: 'ip_country', length: 100, nullable: true })
  ipCountry: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deactivated_at', type: 'timestamp', nullable: true })
  deactivatedAt: Date;

  @Column({ name: 'deactivated_by', nullable: true })
  deactivatedBy: number;

  @Column({ name: 'deactivation_reason', length: 255, nullable: true })
  deactivationReason: string;
}
