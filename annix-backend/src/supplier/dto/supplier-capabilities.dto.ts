import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveSupplierCapabilitiesDto {
  @ApiProperty({
    description: 'List of capability values the supplier can offer',
    example: ['fabricated_steel', 'fasteners_gaskets', 'surface_protection'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one capability must be selected' })
  capabilities: string[];
}

export class SupplierCapabilitiesResponseDto {
  @ApiProperty({
    description: 'List of capability values the supplier can offer',
    example: ['fabricated_steel', 'fasteners_gaskets'],
    type: [String],
  })
  capabilities: string[];
}
