import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { InstrumentCategory } from "../entities/instrument-rfq.entity";

export class CreateInstrumentRfqDto {
  @ApiProperty({ description: "Instrument type", example: "mag_flowmeter" })
  @IsString()
  instrumentType: string;

  @ApiProperty({ description: "Instrument category", enum: InstrumentCategory })
  @IsEnum(InstrumentCategory)
  instrumentCategory: InstrumentCategory;

  @ApiProperty({ description: "Size in DN", required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ description: "Process connection type" })
  @IsString()
  processConnection: string;

  @ApiProperty({ description: "Wetted parts material" })
  @IsString()
  wettedMaterial: string;

  @ApiProperty({ description: "Measurement range minimum", required: false })
  @IsOptional()
  @IsNumber()
  rangeMin?: number;

  @ApiProperty({ description: "Measurement range maximum", required: false })
  @IsOptional()
  @IsNumber()
  rangeMax?: number;

  @ApiProperty({ description: "Range unit", required: false })
  @IsOptional()
  @IsString()
  rangeUnit?: string;

  @ApiProperty({ description: "Output signal type", required: false })
  @IsOptional()
  @IsString()
  outputSignal?: string;

  @ApiProperty({ description: "Communication protocol", required: false })
  @IsOptional()
  @IsString()
  communicationProtocol?: string;

  @ApiProperty({ description: "Display type", required: false })
  @IsOptional()
  @IsString()
  displayType?: string;

  @ApiProperty({ description: "Power supply type", required: false })
  @IsOptional()
  @IsString()
  powerSupply?: string;

  @ApiProperty({ description: "Cable entry type", required: false })
  @IsOptional()
  @IsString()
  cableEntry?: string;

  @ApiProperty({ description: "Explosion proof classification", required: false })
  @IsOptional()
  @IsString()
  explosionProof?: string;

  @ApiProperty({ description: "IP rating", required: false })
  @IsOptional()
  @IsString()
  ipRating?: string;

  @ApiProperty({ description: "Accuracy class", required: false })
  @IsOptional()
  @IsString()
  accuracyClass?: string;

  @ApiProperty({ description: "Calibration type", required: false })
  @IsOptional()
  @IsString()
  calibration?: string;

  @ApiProperty({ description: "Process media" })
  @IsString()
  processMedia: string;

  @ApiProperty({ description: "Operating pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  operatingPressure?: number;

  @ApiProperty({
    description: "Operating temperature in Celsius",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  operatingTemp?: number;

  @ApiProperty({ description: "Quantity", example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: "Supplier reference", required: false })
  @IsOptional()
  @IsString()
  supplierReference?: string;

  @ApiProperty({ description: "Model number", required: false })
  @IsOptional()
  @IsString()
  modelNumber?: string;

  @ApiProperty({ description: "Unit cost from supplier", required: false })
  @IsOptional()
  @IsNumber()
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", required: false })
  @IsOptional()
  @IsNumber()
  markupPercentage?: number;

  @ApiProperty({ description: "Unit cost", required: false })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty({ description: "Total cost", required: false })
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiProperty({ description: "Additional notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: "Calculation data", required: false })
  @IsOptional()
  calculationData?: Record<string, any>;
}

export class InstrumentRfqResponseDto {
  @ApiProperty({ description: "Primary key" })
  id: number;

  @ApiProperty({ description: "Instrument type" })
  instrumentType: string;

  @ApiProperty({ description: "Instrument category" })
  instrumentCategory: InstrumentCategory;

  @ApiProperty({ description: "Size" })
  size?: string;

  @ApiProperty({ description: "Process connection" })
  processConnection: string;

  @ApiProperty({ description: "Wetted material" })
  wettedMaterial: string;

  @ApiProperty({ description: "Range min" })
  rangeMin?: number;

  @ApiProperty({ description: "Range max" })
  rangeMax?: number;

  @ApiProperty({ description: "Range unit" })
  rangeUnit?: string;

  @ApiProperty({ description: "Output signal" })
  outputSignal: string;

  @ApiProperty({ description: "Communication protocol" })
  communicationProtocol?: string;

  @ApiProperty({ description: "Display type" })
  displayType: string;

  @ApiProperty({ description: "Power supply" })
  powerSupply: string;

  @ApiProperty({ description: "Cable entry" })
  cableEntry: string;

  @ApiProperty({ description: "Explosion proof" })
  explosionProof: string;

  @ApiProperty({ description: "IP rating" })
  ipRating: string;

  @ApiProperty({ description: "Accuracy class" })
  accuracyClass?: string;

  @ApiProperty({ description: "Calibration" })
  calibration: string;

  @ApiProperty({ description: "Process media" })
  processMedia: string;

  @ApiProperty({ description: "Operating pressure" })
  operatingPressure?: number;

  @ApiProperty({ description: "Operating temperature" })
  operatingTemp?: number;

  @ApiProperty({ description: "Quantity" })
  quantityValue: number;

  @ApiProperty({ description: "Supplier reference" })
  supplierReference?: string;

  @ApiProperty({ description: "Model number" })
  modelNumber?: string;

  @ApiProperty({ description: "Unit cost from supplier" })
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage" })
  markupPercentage: number;

  @ApiProperty({ description: "Unit cost" })
  unitCost?: number;

  @ApiProperty({ description: "Total cost" })
  totalCost?: number;

  @ApiProperty({ description: "Notes" })
  notes?: string;

  @ApiProperty({ description: "Calculation data" })
  calculationData?: Record<string, any>;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;

  @ApiProperty({ description: "Updated at" })
  updatedAt: Date;
}
