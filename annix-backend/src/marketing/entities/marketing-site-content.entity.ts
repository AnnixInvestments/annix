import type { MarketingSiteContent as MarketingSiteContentTree } from "@annix/product-data/marketing";
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("marketing_site_content")
export class MarketingSiteContent {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id: string;

  @Column({ type: "jsonb" })
  draft: MarketingSiteContentTree;

  @Column({ type: "jsonb" })
  published: MarketingSiteContentTree;

  @Column({ name: "draft_updated_at", type: "varchar", length: 40, nullable: true })
  draftUpdatedAt: string | null;

  @Column({ name: "last_published_at", type: "varchar", length: 40, nullable: true })
  lastPublishedAt: string | null;

  @Column({ name: "last_published_by", type: "varchar", length: 200, nullable: true })
  lastPublishedBy: string | null;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
