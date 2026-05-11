import { ApiProperty } from "@nestjs/swagger";
import { ProductDataSheetKind } from "../../entities/product-data-sheet.entity";

/**
 * Returned by `POST /nix/product-data-sheets/upload`. The QuoteSpecsEditor
 * uses `brand` + `description` to populate the supplier row; the rest of the
 * fields are informational so the UI can show 'Matched existing Linard 60
 * Rev 03' or 'Registered as new — Linard 60 Rev 04 (supersedes Rev 03)'.
 */
export class UploadProductDataSheetResponseDto {
  @ApiProperty()
  dataSheetId: number;

  @ApiProperty()
  manufacturer: string;

  @ApiProperty()
  productName: string;

  @ApiProperty({ enum: ProductDataSheetKind })
  kind: ProductDataSheetKind;

  @ApiProperty()
  version: number;

  @ApiProperty({ required: false, nullable: true })
  publishedRevision: string | null;

  @ApiProperty({ required: false, nullable: true })
  publishedDate: string | null;

  @ApiProperty({
    description: "Brand string for the QuoteSpecsEditor supplier-row brand field.",
    required: false,
    nullable: true,
  })
  brand: string | null;

  @ApiProperty({
    description: "Description string for the QuoteSpecsEditor supplier-row description field.",
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description:
      "Outcome of the library lookup: 'new' (first time we've seen this manufacturer + product), 'reused' (incoming revision matched current — no new row created), 'superseded' (newer revision, archived the previous current row).",
    enum: ["new", "reused", "superseded"],
  })
  outcome: "new" | "reused" | "superseded";

  @ApiProperty({
    description:
      "When outcome=superseded, identifies the row that just lost its current status. Null otherwise.",
    required: false,
    nullable: true,
  })
  supersededFromRevision: string | null;
}
