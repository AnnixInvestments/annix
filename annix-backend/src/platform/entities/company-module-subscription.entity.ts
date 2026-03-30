import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Company } from "./company.entity";

@Entity("company_module_subscriptions")
@Unique(["companyId", "moduleCode"])
export class CompanyModuleSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(
    () => Company,
    (company) => company.moduleSubscriptions,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({ name: "module_code", type: "varchar", length: 50 })
  moduleCode: string;

  @CreateDateColumn({ name: "enabled_at" })
  enabledAt: Date;

  @Column({ name: "disabled_at", type: "timestamptz", nullable: true })
  disabledAt: Date | null;
}
