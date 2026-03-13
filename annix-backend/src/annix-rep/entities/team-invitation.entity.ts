import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";
import { TeamRole } from "./team-member.entity";
import { Territory } from "./territory.entity";

export enum TeamInvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  DECLINED = "declined",
}

@Entity("annix_rep_team_invitations")
@Index(["token"], { unique: true })
export class TeamInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ name: "organization_id" })
  organizationId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "invited_by_id" })
  invitedBy: User;

  @Column({ name: "invited_by_id" })
  invitedById: number;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ name: "invitee_name", type: "varchar", length: 255, nullable: true })
  inviteeName: string | null;

  @Column({ type: "varchar", length: 255 })
  token: string;

  @Column({
    type: "enum",
    enum: TeamRole,
    default: TeamRole.REP,
  })
  role: TeamRole;

  @ManyToOne(() => Territory, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "territory_id" })
  territory: Territory | null;

  @Column({ name: "territory_id", nullable: true })
  territoryId: number | null;

  @Column({
    type: "enum",
    enum: TeamInvitationStatus,
    default: TeamInvitationStatus.PENDING,
  })
  status: TeamInvitationStatus;

  @Column({ type: "text", nullable: true })
  message: string | null;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ name: "accepted_at", type: "timestamp", nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
