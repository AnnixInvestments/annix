import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";

export interface TerritoryBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

@Entity("annix_rep_territories")
export class Territory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ name: "organization_id" })
  organizationId: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "simple-array", nullable: true })
  provinces: string[] | null;

  @Column({ type: "simple-array", nullable: true })
  cities: string[] | null;

  @Column({ type: "json", nullable: true })
  bounds: TerritoryBounds | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to_id" })
  assignedTo: User | null;

  @Column({ name: "assigned_to_id", nullable: true })
  assignedToId: number | null;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
