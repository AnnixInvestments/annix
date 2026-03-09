import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("sc_glossary_terms")
export class GlossaryTerm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  abbreviation: string;

  @Column({ type: "varchar", length: 255 })
  term: string;

  @Column({ type: "text" })
  definition: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  category: string | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "is_custom", type: "boolean", default: false })
  isCustom: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
