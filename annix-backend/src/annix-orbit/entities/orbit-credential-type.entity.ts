import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_credential_types")
@Index("idx_orbit_credential_types_code", ["code"], { unique: true })
export class OrbitCredentialType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "code", type: "varchar", length: 50 })
  code: string;

  @Column({ name: "label", type: "varchar", length: 120 })
  label: string;

  @Column({ name: "description", type: "varchar", length: 500, nullable: true })
  description: string | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @Column({ name: "active", type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
