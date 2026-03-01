import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberCompany } from "./rubber-company.entity";
import { RubberPoExtractionRegion } from "./rubber-po-extraction-region.entity";

@Entity("rubber_po_extraction_template")
export class RubberPoExtractionTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(() => RubberCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: RubberCompany;

  @Column({ name: "format_hash", type: "varchar", length: 64 })
  formatHash: string;

  @Column({ name: "template_name", type: "varchar", length: 255, nullable: true })
  templateName: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "use_count", type: "int", default: 0 })
  useCount: number;

  @Column({ name: "success_count", type: "int", default: 0 })
  successCount: number;

  @Column({ name: "created_by_user_id", type: "int", nullable: true })
  createdByUserId: number | null;

  @OneToMany(
    () => RubberPoExtractionRegion,
    (region) => region.template,
    { cascade: true },
  )
  regions: RubberPoExtractionRegion[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
