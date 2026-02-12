import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSteelSpecificationDto {
    @IsString()
    @IsNotEmpty({ message: 'Steel specification name is required' })
    @ApiProperty({ description: 'Name of the steel specification', example: 'A36 Steel' })
    steelSpecName: string;
}
