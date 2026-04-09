import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("rubber_app_profile")
export class RubberAppProfile {
  @PrimaryColumn({ type: "int", default: 1 })
  id: number;

  @Column({ name: "legal_name", type: "varchar", length: 255, nullable: true })
  legalName: string | null;

  @Column({ name: "trading_name", type: "varchar", length: 255, nullable: true })
  tradingName: string | null;

  @Column({ name: "vat_number", type: "varchar", length: 50, nullable: true })
  vatNumber: string | null;

  @Column({ name: "registration_number", type: "varchar", length: 100, nullable: true })
  registrationNumber: string | null;

  @Column({ name: "street_address", type: "varchar", length: 500, nullable: true })
  streetAddress: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province: string | null;

  @Column({ name: "postal_code", type: "varchar", length: 20, nullable: true })
  postalCode: string | null;

  @Column({ name: "postal_address", type: "varchar", length: 500, nullable: true })
  postalAddress: string | null;

  @Column({ name: "delivery_address", type: "varchar", length: 500, nullable: true })
  deliveryAddress: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ name: "website_url", type: "varchar", length: 255, nullable: true })
  websiteUrl: string | null;

  @Column({ name: "logo_url", type: "varchar", length: 500, nullable: true })
  logoUrl: string | null;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
