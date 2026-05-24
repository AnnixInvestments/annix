import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * One row per Annix brand (annix-investments, annix-orbit, annix-insights,
 * annix-rep, comply-sa). Holds the full theming set so each brand's pages can
 * be re-skinned at runtime. Brands that don't use a given field simply ignore
 * it.
 */
@Entity("app_branding")
export class AppBranding {
  @PrimaryColumn({ name: "brand_code", type: "varchar", length: 64 })
  brandCode: string;

  @Column({ name: "navbar_color", type: "varchar", length: 9, default: "#323288" })
  navbarColor: string;

  @Column({ name: "accent_orange", type: "varchar", length: 9, default: "#FF8A00" })
  accentOrange: string;

  @Column({ name: "accent_orange_light", type: "varchar", length: 9, default: "#FF9C33" })
  accentOrangeLight: string;

  @Column({ name: "accent_orange_dark", type: "varchar", length: 9, default: "#CC6900" })
  accentOrangeDark: string;

  @Column({ name: "gradient_from", type: "varchar", length: 9, default: "#1a1a40" })
  gradientFrom: string;

  @Column({ name: "gradient_via", type: "varchar", length: 9, default: "#0d0d20" })
  gradientVia: string;

  @Column({ name: "gradient_to", type: "varchar", length: 9, default: "#1a1a40" })
  gradientTo: string;

  @Column({ name: "tagline", type: "varchar", length: 200, default: "" })
  tagline: string;

  @Column({ name: "description", type: "text", default: "" })
  description: string;

  @Column({ name: "logo_icon_path", type: "varchar", length: 500, nullable: true })
  logoIconPath: string | null;

  @Column({ name: "logo_lockup_path", type: "varchar", length: 500, nullable: true })
  logoLockupPath: string | null;

  @Column({ name: "wordmark_path", type: "varchar", length: 500, nullable: true })
  wordmarkPath: string | null;

  @Column({ name: "favicon_path", type: "varchar", length: 500, nullable: true })
  faviconPath: string | null;

  @Column({ name: "watermark_path", type: "varchar", length: 500, nullable: true })
  watermarkPath: string | null;

  @Column({ name: "text_crop_path", type: "varchar", length: 500, nullable: true })
  textCropPath: string | null;

  @Column({ name: "watermark_enabled", type: "boolean", default: true })
  watermarkEnabled: boolean;

  @Column({ name: "watermark_opacity", type: "double precision", default: 0.1 })
  watermarkOpacity: number;

  @Column({ name: "watermark_max_size_px", type: "int", default: 880 })
  watermarkMaxSizePx: number;

  @Column({ name: "loading_animation", type: "varchar", length: 32, default: "pulse" })
  loadingAnimation: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
