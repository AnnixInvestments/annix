import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, Min } from "class-validator";

/**
 * Payload for `POST /nix/sessions/:id/submit`.
 *
 * The grand total is computed on the frontend (it owns the pooled m² x
 * rate maths) and snapshotted here so the Quotations hub can show a Value
 * column without re-running that calculation for every quote. Optional so
 * an older client that submits without a total still succeeds — the
 * timestamp stamp is the part that matters for the submit semantics.
 */
export class SubmitQuoteDto {
  @ApiProperty({
    required: false,
    description:
      "Quote grand total incl VAT, as shown on the working quote page's Quote Total card. Persisted to nix_extraction_sessions.quote_total_inc_vat.",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quoteTotalIncVat?: number;
}
