import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum StockControlRole {
  STOREMAN = "storeman",
  MANAGER = "manager",
  ADMIN = "admin",
}

export enum BrandingType {
  ANNIX = "annix",
  CUSTOM = "custom",
}

@Entity("stock_control_users")
export class StockControlUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50, default: StockControlRole.STOREMAN })
  role: StockControlRole;

  @Column({ name: "email_verified", type: "boolean", default: false })
  emailVerified: boolean;

  @Column({ name: "email_verification_token", type: "varchar", length: 255, nullable: true })
  emailVerificationToken: string | null;

  @Column({ name: "email_verification_expires", type: "timestamptz", nullable: true })
  emailVerificationExpires: Date | null;

  @Column({ name: "branding_type", type: "varchar", length: 20, default: BrandingType.ANNIX })
  brandingType: BrandingType;

  @Column({ name: "website_url", type: "varchar", length: 500, nullable: true })
  websiteUrl: string | null;

  @Column({ name: "branding_authorized", type: "boolean", default: false })
  brandingAuthorized: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
