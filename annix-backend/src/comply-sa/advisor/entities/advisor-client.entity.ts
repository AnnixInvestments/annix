import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";
import { ComplySaUser } from "../../companies/entities/user.entity";

@Entity("comply_sa_advisor_clients")
@Unique(["advisorUserId", "clientCompanyId"])
export class ComplySaAdvisorClient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "advisor_user_id", type: "int" })
  advisorUserId!: number;

  @Column({ name: "client_company_id", type: "int" })
  clientCompanyId!: number;

  @CreateDateColumn({ name: "added_at" })
  addedAt!: Date;

  @ManyToOne(() => ComplySaUser)
  @JoinColumn({ name: "advisor_user_id" })
  advisorUser!: ComplySaUser;

  @ManyToOne(() => ComplySaCompany)
  @JoinColumn({ name: "client_company_id" })
  clientCompany!: ComplySaCompany;
}
