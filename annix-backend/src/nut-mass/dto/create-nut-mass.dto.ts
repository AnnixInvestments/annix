import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsNumber, isNumber } from "class-validator";


export class CreateNutMassDto {
    @ApiProperty({
        description: 'Bolt ID',
        example: 1,
    })
    @IsNotEmpty()
    @IsInt()
    boltId: number;

    @ApiProperty({ 
        example: 0.017, 
        description: 'Mass of a single nut in kilograms' })
    @IsNumber()
    mass_kg: number;
}
