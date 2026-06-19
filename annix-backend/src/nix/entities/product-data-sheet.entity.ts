import { ApiProperty } from "@nestjs/swagger";
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
export class ProductDataSheet {
  @ApiProperty({ description: "Primary key" })
  id: number;

  @ApiProperty({ description: "Manufacturer as printed on the data sheet (e.g. 'Linatex')." })
  manufacturer: string;

  @ApiProperty({
    description:
      "Lowercase hyphenated slug derived from manufacturer (e.g. 'linatex'). Library lookup key — quoter never sees this.",
  })
  manufacturerSlug: string;

  @ApiProperty({ description: "Product name as printed on the data sheet (e.g. 'Linard 60')." })
  productName: string;

  @ApiProperty({
    description: "Lowercase hyphenated slug derived from product name (e.g. 'linard-60').",
  })
  productSlug: string;

  @ApiProperty({
    description:
      "Which quote section this product is consumed by — drives which prompt Gemini uses on next upload.",
    enum: ProductDataSheetKind,
  })
  kind: ProductDataSheetKind;

  @ApiProperty({
    description:
      "Sequential version within (manufacturerSlug, productSlug). Starts at 1, increments on each genuine supersede.",
  })
  version: number;

  @ApiProperty({
    description:
      "Revision printed on the data sheet itself (e.g. 'Rev 03', 'Issue 2.1', 'A4'). Authoritative — supersede decisions key off this, not the sequential version. Null when Gemini couldn't find one.",
    required: false,
  })
  publishedRevision?: string;

  @ApiProperty({
    description: "Publication / issue date printed on the data sheet, if Gemini can find one.",
    required: false,
  })
  publishedDate?: string;

  @ApiProperty({ description: "Durable S3 key for the source PDF / image." })
  storagePath: string;

  @ApiProperty({ description: "Original filename as the quoter uploaded it." })
  originalFilename: string;

  @ApiProperty({ description: "File size in bytes." })
  sizeBytes: number;

  @ApiProperty({ description: "MIME type of the stored object." })
  mimeType: string;

  @ApiProperty({
    description:
      "Cached Gemini-extracted brand string, formatted for the QuoteSpecsEditor supplier-row brand field.",
    required: false,
  })
  extractedBrand?: string;

  @ApiProperty({
    description:
      "Cached Gemini-extracted description string, formatted for the QuoteSpecsEditor supplier-row description field.",
    required: false,
  })
  extractedDescription?: string;

  uploadedBy?: User;

  uploadedByUserId?: number;

  @ApiProperty({
    description:
      "Denormalised flag — false when a higher-revision sheet exists for the same (manufacturerSlug, productSlug). Library reads filter on is_latest = true.",
  })
  isLatest: boolean;

  @ApiProperty({
    description:
      "When this version is no longer latest, points to the newer row that superseded it (so an archive view can render a 'see latest →' link).",
    required: false,
  })
  supersededById?: number;

  @ApiProperty({ description: "When this version was superseded.", required: false })
  supersededAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}
