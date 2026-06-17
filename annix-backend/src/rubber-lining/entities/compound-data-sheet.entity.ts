import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export interface CompoundSpec {
  label: string;
  value: string;
  method?: string | null;
}

@Entity("compound_data_sheet")
export class CompoundDataSheet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 200, unique: true })
  slug: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 60, default: "" })
  code: string;

  @Column({ type: "varchar", length: 100, default: "Natural Rubber Lining" })
  category: string;

  @Column({ type: "varchar", length: 100, default: "Natural Rubber" })
  polymer: string;

  @Column({ name: "shore_hardness", type: "varchar", length: 50, default: "" })
  shoreHardness: string;

  @Column({ type: "varchar", length: 50, default: "" })
  colour: string;

  @Column({ name: "cure_method", type: "varchar", length: 50, default: "Steam-Cured" })
  cureMethod: string;

  @Column({ name: "short_description", type: "text", default: "" })
  shortDescription: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  applications: string[];

  @Column({ name: "not_recommended", type: "text", default: "" })
  notRecommended: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  specs: CompoundSpec[];

  @Column({ name: "pdf_url", type: "varchar", length: 500, nullable: true })
  pdfUrl: string | null;

  @Column({ name: "pdf_status", type: "varchar", length: 20, default: "available" })
  pdfStatus: string;

  @Column({ type: "varchar", length: 80, default: "" })
  revision: string;

  @Column({ name: "meta_title", type: "varchar", length: 200, nullable: true })
  metaTitle: string | null;

  @Column({ name: "meta_description", type: "text", nullable: true })
  metaDescription: string | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @Column({ name: "is_published", type: "boolean", default: false })
  isPublished: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
