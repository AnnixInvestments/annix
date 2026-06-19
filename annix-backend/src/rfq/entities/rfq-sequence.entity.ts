import { ApiProperty } from "@nestjs/swagger";
export class RfqSequence {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Year for this sequence", example: 2026 })
  year: number;

  @ApiProperty({
    description: "Last used sequence number for this year",
    example: 42,
  })
  lastSequence: number;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
