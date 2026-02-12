import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsInt, IsArray, Min, Max } from 'class-validator';

export class CreateBendRfqDto {
  @ApiProperty({ 
    description: 'Nominal bore in mm', 
    example: 350,
    minimum: 15,
    maximum: 600
  })
  @IsNumber()
  @Min(15)
  @Max(600)
  nominalBoreMm: number;

  @ApiProperty({ 
    description: 'Schedule number or wall thickness specification', 
    example: 'Sch30'
  })
  @IsString()
  scheduleNumber: string;

  @ApiProperty({ 
    description: 'Type of bend (1.5D, 2D, 3D, 5D)', 
    example: '3D',
    enum: ['1.5D', '2D', '3D', '5D']
  })
  @IsString()
  bendType: string;

  @ApiProperty({ 
    description: 'Bend angle in degrees', 
    example: 45,
    minimum: 15,
    maximum: 180
  })
  @IsNumber()
  @Min(15)
  @Max(180)
  bendDegrees: number;

  @ApiProperty({ 
    description: 'Number of tangents', 
    example: 1,
    minimum: 0,
    maximum: 10
  })
  @IsInt()
  @Min(0)
  @Max(10)
  numberOfTangents: number;

  @ApiProperty({ 
    description: 'Length of each tangent in mm', 
    example: [400],
    type: [Number]
  })
  @IsArray()
  @IsNumber({}, { each: true })
  tangentLengths: number[];

  @ApiProperty({ 
    description: 'Quantity of this bend item', 
    example: 1,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  quantityValue: number;

  @ApiProperty({ 
    description: 'Quantity type', 
    example: 'number_of_items',
    enum: ['number_of_items']
  })
  @IsString()
  quantityType: 'number_of_items';

  @ApiProperty({ 
    description: 'Working pressure in bar', 
    example: 16,
    minimum: 1,
    maximum: 420
  })
  @IsNumber()
  @Min(1)
  @Max(420)
  workingPressureBar: number;

  @ApiProperty({ 
    description: 'Working temperature in Celsius', 
    example: 20,
    minimum: -50,
    maximum: 800
  })
  @IsNumber()
  @Min(-50)
  @Max(800)
  workingTemperatureC: number;

  @ApiProperty({ 
    description: 'Steel specification ID', 
    example: 2
  })
  @IsNumber()
  steelSpecificationId: number;

  @ApiProperty({ 
    description: 'Use global flange specifications', 
    example: true,
    required: false
  })
  @IsOptional()
  useGlobalFlangeSpecs?: boolean;

  @ApiProperty({ 
    description: 'Flange standard ID (if not using global specs)', 
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  flangeStandardId?: number;

  @ApiProperty({ 
    description: 'Flange pressure class ID (if not using global specs)', 
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  flangePressureClassId?: number;
}