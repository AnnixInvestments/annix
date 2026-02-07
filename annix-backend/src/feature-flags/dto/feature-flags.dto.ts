import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString } from "class-validator";

export class FeatureFlagDto {
  @ApiProperty({ description: "Flag key", example: "RUBBER_PORTAL" })
  flagKey: string;

  @ApiProperty({ description: "Whether the flag is enabled", example: false })
  enabled: boolean;

  @ApiProperty({
    description: "Flag description",
    example: "Rubber lining portal module",
    nullable: true,
  })
  description: string | null;
}

export class UpdateFeatureFlagDto {
  @ApiProperty({ description: "Flag key to update", example: "RUBBER_PORTAL" })
  @IsString()
  flagKey: string;

  @ApiProperty({ description: "New enabled state", example: true })
  @IsBoolean()
  enabled: boolean;
}

export class AllFlagsResponseDto {
  @ApiProperty({
    description: "Map of flag keys to enabled state",
    example: {
      REMOTE_ACCESS: false,
      RUBBER_PORTAL: false,
      REFERENCE_DATA: false,
    },
  })
  flags: Record<string, boolean>;
}

export class FeatureFlagDetailDto {
  @ApiProperty({
    description: "Detailed list of all feature flags",
    type: [FeatureFlagDto],
  })
  flags: FeatureFlagDto[];
}
