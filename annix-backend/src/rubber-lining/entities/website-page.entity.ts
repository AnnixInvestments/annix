import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("website_page")
export class WebsitePage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 200, unique: true })
  slug: string;

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ name: "meta_title", type: "varchar", length: 200, nullable: true })
  metaTitle: string | null;

  @Column({ name: "meta_description", type: "text", nullable: true })
  metaDescription: string | null;

  @Column({ type: "text", default: "" })
  content: string;

  @Column({ name: "hero_image_url", type: "varchar", length: 500, nullable: true })
  heroImageUrl: string | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @Column({ name: "is_published", type: "boolean", default: false })
  isPublished: boolean;

  @Column({ name: "is_home_page", type: "boolean", default: false })
  isHomePage: boolean;

  @Column({ name: "show_in_nav", type: "boolean", default: true })
  showInNav: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
