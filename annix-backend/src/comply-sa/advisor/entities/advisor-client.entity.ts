import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Company } from "../../../platform/entities/company.entity";
import { User } from "../../../user/entities/user.entity";

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

  @ManyToOne(() => User)
  @JoinColumn({ name: "advisor_user_id" })
  advisorUser!: User;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "client_company_id" })
  clientCompany!: Company;
}
