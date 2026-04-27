import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type TestimonialSource = "google" | "manual" | "email" | "whatsapp";

@Entity("testimonial")
export class Testimonial {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "author_name", type: "varchar", length: 200 })
  authorName: string;

  @Column({ name: "author_role", type: "varchar", length: 200, nullable: true })
  authorRole: string | null;

  @Column({ name: "author_company", type: "varchar", length: 200, nullable: true })
  authorCompany: string | null;

  @Column({ type: "smallint" })
  rating: number;

  @Column({ type: "text" })
  body: string;

  @Column({ name: "date_published", type: "date" })
  datePublished: string;

  @Column({ type: "varchar", length: 20, default: "manual" })
  source: TestimonialSource;

  @Column({ type: "boolean", default: false })
  highlight: boolean;

  @Column({ name: "is_published", type: "boolean", default: true })
  isPublished: boolean;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
