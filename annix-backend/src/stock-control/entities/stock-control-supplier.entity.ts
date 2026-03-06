import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("stock_control_supplier")
@Unique(["companyId", "name"])
export class StockControlSupplier {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "vat_number", type: "varchar", length: 50, nullable: true })
  vatNumber: string | null;

  @Column({ name: "registration_number", type: "varchar", length: 50, nullable: true })
  registrationNumber: string | null;

  @Column({ name: "address", type: "text", nullable: true })
  address: string | null;

  @Column({ name: "contact_person", type: "varchar", length: 255, nullable: true })
  contactPerson: string | null;

  @Column({ name: "phone", type: "varchar", length: 50, nullable: true })
  phone: string | null;

  @Column({ name: "email", type: "varchar", length: 255, nullable: true })
  email: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
