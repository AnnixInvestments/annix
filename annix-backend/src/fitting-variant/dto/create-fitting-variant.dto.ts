import { Type } from 'class-transformer';
import { ValidateNested, IsArray, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateFittingBoreDto } from 'src/fitting-bore/dto/create-fitting-bore.dto';
import { CreateFittingDimensionDto } from '../../fitting-dimension/dto/create-fitting-dimension.dto';

export class CreateFittingVariantDto {
  @ApiProperty({ example: 1, description: 'Parent Fitting ID' })
  @IsNumber()
  @IsNotEmpty()
  fittingId: number;

  @ApiProperty({
    type: [CreateFittingBoreDto],
    description: 'List of bores for this fitting variant',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => CreateFittingBoreDto)
  bores: CreateFittingBoreDto[];

  @ApiProperty({
    type: [CreateFittingDimensionDto],
    description: 'Optional dimensions for this fitting variant',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateFittingDimensionDto)
  @IsOptional()
  dimensions?: CreateFittingDimensionDto[];
}

