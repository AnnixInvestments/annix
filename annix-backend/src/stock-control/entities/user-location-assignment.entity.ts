import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlLocation } from "./stock-control-location.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("user_location_assignments")
@Unique(["companyId", "userId", "locationId"])
export class UserLocationAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: StockControlUser;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => StockControlLocation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "location_id" })
  location: StockControlLocation;

  @Column({ name: "location_id" })
  locationId: number;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_user_id" })
  unifiedUser?: User | null;

  @Column({ name: "unified_user_id", nullable: true })
  unifiedUserId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
