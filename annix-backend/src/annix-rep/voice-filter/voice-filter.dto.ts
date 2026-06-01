import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertVoiceProfileDto {
  @ApiProperty({ description: "Whether the user has an enrolled voice profile" })
  @IsBoolean()
  enrolled: boolean;

  @ApiPropertyOptional({ description: "AWS Voice ID speaker identifier (non-secret reference)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  awsSpeakerId?: string;

  @ApiPropertyOptional({ description: "AWS Voice ID domain identifier (non-secret reference)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  awsDomainId?: string;
}

export class VoiceProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  enrolled: boolean;

  @ApiPropertyOptional()
  awsSpeakerId: string | null;

  @ApiPropertyOptional()
  awsDomainId: string | null;

  @ApiPropertyOptional()
  enrolledAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
