import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("blog_post")
export class BlogPost {
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
  excerpt: string;

  @Column({ type: "text", default: "" })
  content: string;

  @Column({ name: "hero_image_url", type: "varchar", length: 500, nullable: true })
  heroImageUrl: string | null;

  @Column({ type: "varchar", length: 200, default: "AU Industries" })
  author: string;

  @Column({ name: "published_at", type: "timestamptz", nullable: true })
  publishedAt: Date | null;

  @Column({ name: "is_published", type: "boolean", default: false })
  isPublished: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
