import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("cv_assistant_companies")
export class AnnixOrbitCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "email_from_address", type: "varchar", length: 255, nullable: true })
  emailFromAddress: string | null;

  @Column({ name: "is_designated_employer", type: "boolean", default: false })
  isDesignatedEmployer: boolean;

  @Column({ name: "economic_sector", type: "varchar", length: 100, nullable: true })
  economicSector: string | null;

  @Column({ name: "eea_reporting_enabled", type: "boolean", default: false })
  eeaReportingEnabled: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
