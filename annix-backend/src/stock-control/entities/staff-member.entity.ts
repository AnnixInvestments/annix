import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("stock_control_staff_members")
export class StaffMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "employee_number", type: "varchar", length: 100, nullable: true })
  employeeNumber: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  department: string | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "qr_token", type: "uuid" })
  qrToken: string;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @OneToMany(
    () => StockAllocation,
    (allocation) => allocation.staffMember,
  )
  allocations: StockAllocation[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
