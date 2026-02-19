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
import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";

export enum TeamRole {
  ADMIN = "admin",
  MANAGER = "manager",
  REP = "rep",
}

export enum TeamMemberStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

@Entity("annix_rep_team_members")
@Unique(["organizationId", "userId"])
export class TeamMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ name: "organization_id" })
  organizationId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({
    type: "enum",
    enum: TeamRole,
    default: TeamRole.REP,
  })
  role: TeamRole;

  @Column({
    type: "enum",
    enum: TeamMemberStatus,
    default: TeamMemberStatus.ACTIVE,
  })
  status: TeamMemberStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "reports_to_id" })
  reportsTo: User | null;

  @Column({ name: "reports_to_id", nullable: true })
  reportsToId: number | null;

  @Column({ name: "joined_at", type: "timestamp", default: () => "now()" })
  joinedAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
