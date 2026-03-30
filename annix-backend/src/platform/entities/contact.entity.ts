import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "./company.entity";

export enum ContactType {
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
  BOTH = "BOTH",
}

@Entity("contacts")
@Unique(["companyId", "name", "contactType"])
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(
    () => Company,
    (company) => company.contacts,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({
    name: "contact_type",
    type: "varchar",
    length: 20,
    default: ContactType.SUPPLIER,
  })
  contactType: ContactType;

  @Column({ type: "varchar", length: 20, nullable: true })
  code: string | null;

  @Column({
    name: "registration_number",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  registrationNumber: string | null;

  @Column({
    name: "vat_number",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  vatNumber: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({
    name: "contact_person",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  contactPerson: string | null;

  @Column({ name: "address_text", type: "text", nullable: true })
  addressText: string | null;

  @Column({ name: "address_jsonb", type: "jsonb", nullable: true })
  addressJsonb: Record<string, string> | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "email_config", type: "jsonb", nullable: true })
  emailConfig: Record<string, string> | null;

  @Column({
    name: "available_products",
    type: "jsonb",
    default: "[]",
  })
  availableProducts: string[];

  @Column({ name: "firebase_uid", type: "varchar", length: 100, nullable: true })
  firebaseUid: string | null;

  @Column({ name: "pricing_tier_id", type: "int", nullable: true })
  pricingTierId: number | null;

  @Column({
    name: "pricing_tier_firebase_uid",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  pricingTierFirebaseUid: string | null;

  @Column({ name: "sage_contact_id", type: "int", nullable: true })
  sageContactId: number | null;

  @Column({
    name: "sage_contact_type",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  sageContactType: string | null;

  @Column({ name: "legacy_sc_supplier_id", type: "int", nullable: true })
  legacyScSupplierId: number | null;

  @Column({ name: "legacy_rubber_company_id", type: "int", nullable: true })
  legacyRubberCompanyId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
