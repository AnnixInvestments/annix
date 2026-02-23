import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { NaceRequiresHardnessLimit, Psl2RequiresCvn } from "../../shared/validators";

export class CreateBendRfqDto {
  @ApiProperty({
    description: "Nominal bore in mm",
    example: 350,
    minimum: 15,
    maximum: 600,
  })
  @IsNumber()
  @Min(15)
  @Max(600)
  nominalBoreMm: number;

  @ApiProperty({
    description: "Schedule number or wall thickness specification",
    example: "Sch30",
  })
  @IsString()
  scheduleNumber: string;

  @ApiProperty({
    description: "Wall thickness in mm",
    example: 6.35,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({
    description: "Type of bend (1D, 1.5D, 2D, 3D, 5D) - for pulled bends",
    example: "3D",
    enum: ["1D", "1.5D", "2D", "3D", "5D"],
    required: false,
  })
  @IsOptional()
  @IsString()
  bendType?: string;

  @ApiProperty({
    description: "Bend radius type (elbow, medium, long) - for SABS 719 segmented bends",
    example: "long",
    enum: ["elbow", "medium", "long"],
    required: false,
  })
  @IsOptional()
  @IsString()
  bendRadiusType?: string;

  @ApiProperty({
    description: "Bend end configuration",
    example: "2xLF",
    required: false,
  })
  @IsOptional()
  @IsString()
  bendEndConfiguration?: string;

  @ApiProperty({
    description: "Bend angle in degrees",
    example: 45,
    minimum: 15,
    maximum: 180,
  })
  @IsNumber()
  @Min(15)
  @Max(180)
  bendDegrees: number;

  @ApiProperty({
    description: "Number of tangents",
    example: 1,
    minimum: 0,
    maximum: 10,
  })
  @IsInt()
  @Min(0)
  @Max(10)
  numberOfTangents: number;

  @ApiProperty({
    description: "Length of each tangent in mm",
    example: [400],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  tangentLengths: number[];

  @ApiProperty({
    description: "Quantity of this bend item",
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantityValue: number;

  @ApiProperty({
    description: "Quantity type",
    example: "number_of_items",
    enum: ["number_of_items"],
  })
  @IsString()
  quantityType: "number_of_items";

  @ApiProperty({
    description: "Working pressure in bar",
    example: 16,
    minimum: 1,
    maximum: 420,
  })
  @IsNumber()
  @Min(1)
  @Max(420)
  workingPressureBar: number;

  @ApiProperty({
    description: "Working temperature in Celsius",
    example: 20,
    minimum: -50,
    maximum: 800,
  })
  @IsNumber()
  @Min(-50)
  @Max(800)
  workingTemperatureC: number;

  @ApiProperty({
    description: "Steel specification ID",
    example: 2,
  })
  @IsNumber()
  steelSpecificationId: number;

  @ApiProperty({
    description: "Use global flange specifications",
    example: true,
    required: false,
  })
  @IsOptional()
  useGlobalFlangeSpecs?: boolean;

  @ApiProperty({
    description: "Flange standard ID (if not using global specs)",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  flangeStandardId?: number;

  @ApiProperty({
    description: "Flange pressure class ID (if not using global specs)",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  flangePressureClassId?: number;

  @ApiProperty({ description: "PSL level (PSL1 or PSL2) for API 5L specs", required: false })
  @IsOptional()
  @IsString()
  @Psl2RequiresCvn()
  pslLevel?: string;

  @ApiProperty({ description: "CVN test temperature in Celsius", required: false })
  @IsOptional()
  @IsNumber()
  cvnTestTemperatureC?: number;

  @ApiProperty({ description: "CVN average impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber()
  cvnAverageJoules?: number;

  @ApiProperty({ description: "CVN minimum impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber()
  cvnMinimumJoules?: number;

  @ApiProperty({ description: "Heat number for traceability", required: false })
  @IsOptional()
  @IsString()
  heatNumber?: string;

  @ApiProperty({ description: "Material Test Certificate reference", required: false })
  @IsOptional()
  @IsString()
  mtcReference?: string;

  @ApiProperty({ description: "NDT coverage percentage (100% for PSL2)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ndtCoveragePct?: number;

  @ApiProperty({ description: "Lot number for traceability", required: false })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiProperty({ description: "NACE MR0175/ISO 15156 compliance", required: false })
  @IsOptional()
  @IsBoolean()
  naceCompliant?: boolean;

  @ApiProperty({ description: "H2S zone (1, 2, or 3) for sour service", required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  h2sZone?: number;

  @ApiProperty({ description: "Maximum hardness in HRC (<=22 for sour service)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(70)
  @NaceRequiresHardnessLimit()
  maxHardnessHrc?: number;

  @ApiProperty({ description: "Sulfide Stress Cracking tested", required: false })
  @IsOptional()
  @IsBoolean()
  sscTested?: boolean;

  @ApiProperty({ description: "Manufacturing process (Seamless, ERW, SAW, LSAW)", required: false })
  @IsOptional()
  @IsString()
  manufacturingProcess?: string;

  @ApiProperty({ description: "Delivery condition (As-Rolled, Normalized, Q&T)", required: false })
  @IsOptional()
  @IsString()
  deliveryCondition?: string;

  @ApiProperty({ description: "Bevel angle in degrees (default 37.5°)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  bevelAngleDeg?: number;

  @ApiProperty({ description: "Root face dimension in mm (default 1.6mm)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  rootFaceMm?: number;

  @ApiProperty({ description: "Root gap dimension in mm (1.6-3.2mm range)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  rootGapMm?: number;

  @ApiProperty({ description: "UNS number (e.g., K03006 for A106 Gr.B)", required: false })
  @IsOptional()
  @IsString()
  unsNumber?: string;

  @ApiProperty({ description: "Specified Minimum Yield Strength in MPa", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  smysMpa?: number;

  @ApiProperty({ description: "Carbon equivalent for weldability (Ceq ≤0.43)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  carbonEquivalent?: number;
}
