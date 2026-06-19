import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"; // One row per clarification email sent. The token is what the
// customer follows in the email link (and is the lookup key for the
// public GET / POST endpoints). Requirements snapshot at send time
// is preserved verbatim so the customer's form mirrors what we
// asked for, even if the BOQ has changed since. Responses are null
// until the customer hits Submit on the public form.
export class RfqClarificationRequest {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description:
      "32-char hex token (16 bytes from crypto.randomBytes) — used as the lookup key for the public clarification form. URL shape: /customer/clarifications/{token}",
    example: "f4c3b1a2d8e9f0a1b2c3d4e5f6a7b8c9",
  })
  token: string;

  @ApiPropertyOptional({
    description:
      "Owning RFQ draft id when the customer was logged in at send time. Null for unregistered tender drops — the token alone gates access in that case.",
  })
  rfqDraftId?: number;

  @ApiPropertyOptional({ description: "Customer email the email was sent to" })
  customerEmail?: string;

  @ApiPropertyOptional({ description: "Project name surfaced in the email + form header" })
  projectName?: string;

  @ApiPropertyOptional({ description: "RFQ reference / draft number surfaced in the email" })
  rfqReference?: string;

  @ApiProperty({
    description:
      "Snapshot of what we asked for at send time — { missingDrawings, valveSpecGaps, customNote, customerName }. JSONB so the form can render exactly the rows we asked about, even if the BOQ has changed since.",
  })
  requirements: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "Customer's responses — { drawings: { ref: status }, valves: { itemId: { fieldKey: value } }, notes }. Null until the customer hits Submit on the public form.",
  })
  responses?: Record<string, unknown>;

  @ApiProperty({ description: "When we sent the email" })
  sentAt: Date;

  @ApiPropertyOptional({ description: "When the customer submitted the form. Null if pending." })
  respondedAt?: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;
}
