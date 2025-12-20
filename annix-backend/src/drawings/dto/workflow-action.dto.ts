import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class ApprovalDto {
  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class RejectionDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason: string;
}

export class ChangeRequestDto {
  @ApiProperty({ description: 'Description of changes required' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  changesRequired: string;
}
