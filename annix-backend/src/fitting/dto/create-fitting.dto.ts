import { IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateFittingVariantDto } from '../../fitting-variant/dto/create-fitting-variant.dto';

export class CreateFittingDto {
  @ApiProperty({ example: 1, description: 'SteelSpecification ID' })
  @IsNumber()
  @IsNotEmpty()
  steelSpecificationId: number;

  @ApiProperty({ example: 2, description: 'FittingType ID' })
  @IsNumber()
  @IsNotEmpty()
  fittingTypeId: number;

//   @ApiProperty({
//     type: [CreateFittingVariantDto],
//     description: 'Optional array of variants to create with this fitting',
//     required: false,
//   })
//   @IsOptional()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => CreateFittingVariantDto)
//   variants?: CreateFittingVariantDto[];
}
