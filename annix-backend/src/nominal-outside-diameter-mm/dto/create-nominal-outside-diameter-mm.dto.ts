import { IsNumber, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreatePipeDimensionDto } from 'src/pipe-dimension/dto/create-pipe-dimension.dto';

export class CreateNominalOutsideDiameterMmDto {
    @ApiProperty({ description: 'Nominal diameter in mm', example: 50 })
    @IsNumber()
    @IsNotEmpty()
    nominal_diameter_mm: number;

    @ApiProperty({ description: 'Outside diameter in mm', example: 60.32 })
    @IsNumber()
    @IsNotEmpty()
    outside_diameter_mm: number;

    // @ApiProperty({
    //     description: 'Optional pipe dimensions linked to this nominal outside diameter',
    //     type: [CreatePipeDimensionDto],
    //     required: false,
    // })
    // @IsOptional()
    // @ValidateNested({ each: true })
    // @Type(() => CreatePipeDimensionDto)
    // pipeDimensions?: CreatePipeDimensionDto[];
}
