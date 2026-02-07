import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";
import { CustomerCompany } from "./customer-company.entity";
import { CustomerProfile } from "./customer-profile.entity";

@Entity("customer_blocked_suppliers")
@Index(["customerCompanyId", "supplierProfileId"], { unique: true })
export class CustomerBlockedSupplier {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerCompany)
  @JoinColumn({ name: "customer_company_id" })
  customerCompany: CustomerCompany;

  @Column({ name: "customer_company_id" })
  customerCompanyId: number;

  @ManyToOne(() => SupplierProfile)
  @JoinColumn({ name: "supplier_profile_id" })
  supplierProfile: SupplierProfile;

  @Column({ name: "supplier_profile_id" })
  supplierProfileId: number;

  @ManyToOne(() => CustomerProfile)
  @JoinColumn({ name: "blocked_by" })
  blockedBy: CustomerProfile;

  @Column({ name: "blocked_by" })
  blockedById: number;

  @Column({ name: "reason", type: "text", nullable: true })
  reason: string | null;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
