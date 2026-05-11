import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum ProductDataSheetKind {
  COATING = "coating",
  LINING = "lining",
}

/**
 * Shared org-wide library of product data sheets uploaded across all customer
 * apps. The pattern mirrors the mine-spec revision tracking on NixExtraction:
 * the document's own printed revision (e.g. 'Rev 03', 'Issue 2.1') is the
 * authoritative version, and a new upload that names a higher revision
 * supersedes the existing latest by flipping `is_latest = false` on the old
 * row and pointing `superseded_by_id` at the new one.
 *
 * Same product / same printed revision = no new row, no new S3 object — we
 * reuse the existing record (de-dupe by published_revision per the user's
 * 'version number in small print is the key' rule).
 */
@Entity("product_data_sheets")
@Index("idx_product_data_sheets_slugs_latest", ["manufacturerSlug", "productSlug", "isLatest"])
@Index("idx_product_data_sheets_slugs_revision", [
  "manufacturerSlug",
  "productSlug",
  "publishedRevision",
])
@Index("idx_product_data_sheets_manufacturer", ["manufacturerSlug"])
export class ProductDataSheet {
  @ApiProperty({ description: "Primary key" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Manufacturer as printed on the data sheet (e.g. 'Linatex')." })
  @Column({ name: "manufacturer", type: "varchar", length: 128 })
  manufacturer: string;

  @ApiProperty({
    description:
      "Lowercase hyphenated slug derived from manufacturer (e.g. 'linatex'). Library lookup key — quoter never sees this.",
  })
  @Column({ name: "manufacturer_slug", type: "varchar", length: 128 })
  manufacturerSlug: string;

  @ApiProperty({ description: "Product name as printed on the data sheet (e.g. 'Linard 60')." })
  @Column({ name: "product_name", type: "varchar", length: 256 })
  productName: string;

  @ApiProperty({
    description: "Lowercase hyphenated slug derived from product name (e.g. 'linard-60').",
  })
  @Column({ name: "product_slug", type: "varchar", length: 256 })
  productSlug: string;

  @ApiProperty({
    description:
      "Which quote section this product is consumed by — drives which prompt Gemini uses on next upload.",
    enum: ProductDataSheetKind,
  })
  @Column({ name: "kind", type: "varchar", length: 16 })
  kind: ProductDataSheetKind;

  @ApiProperty({
    description:
      "Sequential version within (manufacturerSlug, productSlug). Starts at 1, increments on each genuine supersede.",
  })
  @Column({ name: "version", type: "int", default: 1 })
  version: number;

  @ApiProperty({
    description:
      "Revision printed on the data sheet itself (e.g. 'Rev 03', 'Issue 2.1', 'A4'). Authoritative — supersede decisions key off this, not the sequential version. Null when Gemini couldn't find one.",
    required: false,
  })
  @Column({ name: "published_revision", type: "varchar", length: 64, nullable: true })
  publishedRevision?: string;

  @ApiProperty({
    description: "Publication / issue date printed on the data sheet, if Gemini can find one.",
    required: false,
  })
  @Column({ name: "published_date", type: "date", nullable: true })
  publishedDate?: string;

  @ApiProperty({ description: "Durable S3 key for the source PDF / image." })
  @Column({ name: "storage_path", type: "varchar", length: 512 })
  storagePath: string;

  @ApiProperty({ description: "Original filename as the quoter uploaded it." })
  @Column({ name: "original_filename", type: "varchar", length: 256 })
  originalFilename: string;

  @ApiProperty({ description: "File size in bytes." })
  @Column({ name: "size_bytes", type: "bigint" })
  sizeBytes: number;

  @ApiProperty({ description: "MIME type of the stored object." })
  @Column({ name: "mime_type", type: "varchar", length: 128 })
  mimeType: string;

  @ApiProperty({
    description:
      "Cached Gemini-extracted brand string, formatted for the QuoteSpecsEditor supplier-row brand field.",
    required: false,
  })
  @Column({ name: "extracted_brand", type: "varchar", length: 256, nullable: true })
  extractedBrand?: string;

  @ApiProperty({
    description:
      "Cached Gemini-extracted description string, formatted for the QuoteSpecsEditor supplier-row description field.",
    required: false,
  })
  @Column({ name: "extracted_description", type: "text", nullable: true })
  extractedDescription?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "uploaded_by_user_id" })
  uploadedBy?: User;

  @Column({ name: "uploaded_by_user_id", type: "int", nullable: true })
  uploadedByUserId?: number;

  @ApiProperty({
    description:
      "Denormalised flag — false when a higher-revision sheet exists for the same (manufacturerSlug, productSlug). Library reads filter on is_latest = true.",
  })
  @Column({ name: "is_latest", type: "boolean", default: true })
  isLatest: boolean;

  @ApiProperty({
    description:
      "When this version is no longer latest, points to the newer row that superseded it (so an archive view can render a 'see latest →' link).",
    required: false,
  })
  @Column({ name: "superseded_by_id", type: "int", nullable: true })
  supersededById?: number;

  @ApiProperty({ description: "When this version was superseded.", required: false })
  @Column({ name: "superseded_at", type: "timestamptz", nullable: true })
  supersededAt?: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
