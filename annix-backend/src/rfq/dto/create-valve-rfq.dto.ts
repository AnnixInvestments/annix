import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { ValveActuatorType, ValveCategory, ValveFailPosition } from "../entities/valve-rfq.entity";

export class CreateValveRfqDto {
  @ApiProperty({ description: "Valve type", example: "ball_valve" })
  @IsString()
  valveType: string;

  @ApiProperty({
    description: "Valve category",
    enum: ValveCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ValveCategory)
  valveCategory?: ValveCategory;

  @ApiProperty({ description: "Valve size in DN", example: "100" })
  @IsString()
  size: string;

  @ApiProperty({ description: "Pressure class", example: "class_150" })
  @IsString()
  pressureClass: string;

  @ApiProperty({ description: "End connection type", example: "flanged_rf" })
  @IsString()
  connectionType: string;

  @ApiProperty({ description: "Body material", example: "cf8m" })
  @IsString()
  bodyMaterial: string;

  @ApiProperty({ description: "Trim material", required: false })
  @IsOptional()
  @IsString()
  trimMaterial?: string;

  @ApiProperty({ description: "Seat/seal material", example: "ptfe" })
  @IsString()
  seatMaterial: string;

  @ApiProperty({ description: "Port type", required: false })
  @IsOptional()
  @IsString()
  portType?: string;

  @ApiProperty({ description: "Actuator type", enum: ValveActuatorType })
  @IsEnum(ValveActuatorType)
  actuatorType: ValveActuatorType;

  @ApiProperty({ description: "Air supply pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  airSupply?: number;

  @ApiProperty({
    description: "Voltage for electric actuators",
    required: false,
  })
  @IsOptional()
  @IsString()
  voltage?: string;

  @ApiProperty({
    description: "Fail position",
    enum: ValveFailPosition,
    required: false,
  })
  @IsOptional()
  @IsEnum(ValveFailPosition)
  failPosition?: ValveFailPosition;

  @ApiProperty({ description: "Positioner type", required: false })
  @IsOptional()
  @IsString()
  positioner?: string;

  @ApiProperty({ description: "Has limit switches", required: false })
  @IsOptional()
  @IsBoolean()
  limitSwitches?: boolean;

  @ApiProperty({ description: "Has solenoid valve", required: false })
  @IsOptional()
  @IsBoolean()
  solenoidValve?: boolean;

  @ApiProperty({ description: "Process media" })
  @IsString()
  media: string;

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

  @ApiProperty({
    description: "Hazardous area classification",
    required: false,
  })
  @IsOptional()
  @IsString()
  hazardousArea?: string;

  @ApiProperty({ description: "Flow coefficient Cv", required: false })
  @IsOptional()
  @IsNumber()
  cv?: number;

  @ApiProperty({ description: "Flow rate in m3/h", required: false })
  @IsOptional()
  @IsNumber()
  flowRate?: number;

  @ApiProperty({ description: "Seat leakage class", required: false })
  @IsOptional()
  @IsString()
  seatLeakageClass?: string;

  @ApiProperty({ description: "Fire safe standard", required: false })
  @IsOptional()
  @IsString()
  fireSafeStandard?: string;

  @ApiProperty({ description: "Cryogenic service type", required: false })
  @IsOptional()
  @IsString()
  cryogenicService?: string;

  @ApiProperty({ description: "Fugitive emissions standard", required: false })
  @IsOptional()
  @IsString()
  fugitiveEmissions?: string;

  @ApiProperty({ description: "Extended bonnet type", required: false })
  @IsOptional()
  @IsString()
  extendedBonnet?: string;

  @ApiProperty({ description: "Certifications", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ description: "Quantity", example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: "Supplier reference", required: false })
  @IsOptional()
  @IsString()
  supplierReference?: string;

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

export class ValveRfqResponseDto {
  @ApiProperty({ description: "Primary key" })
  id: number;

  @ApiProperty({ description: "Valve type" })
  valveType: string;

  @ApiProperty({ description: "Valve category" })
  valveCategory?: ValveCategory;

  @ApiProperty({ description: "Size" })
  size: string;

  @ApiProperty({ description: "Pressure class" })
  pressureClass: string;

  @ApiProperty({ description: "Connection type" })
  connectionType: string;

  @ApiProperty({ description: "Body material" })
  bodyMaterial: string;

  @ApiProperty({ description: "Trim material" })
  trimMaterial?: string;

  @ApiProperty({ description: "Seat material" })
  seatMaterial: string;

  @ApiProperty({ description: "Port type" })
  portType?: string;

  @ApiProperty({ description: "Actuator type" })
  actuatorType: ValveActuatorType;

  @ApiProperty({ description: "Air supply" })
  airSupply?: number;

  @ApiProperty({ description: "Voltage" })
  voltage?: string;

  @ApiProperty({ description: "Fail position" })
  failPosition?: ValveFailPosition;

  @ApiProperty({ description: "Positioner" })
  positioner?: string;

  @ApiProperty({ description: "Limit switches" })
  limitSwitches: boolean;

  @ApiProperty({ description: "Solenoid valve" })
  solenoidValve: boolean;

  @ApiProperty({ description: "Media" })
  media: string;

  @ApiProperty({ description: "Operating pressure" })
  operatingPressure?: number;

  @ApiProperty({ description: "Operating temperature" })
  operatingTemp?: number;

  @ApiProperty({ description: "Hazardous area" })
  hazardousArea: string;

  @ApiProperty({ description: "Cv" })
  cv?: number;

  @ApiProperty({ description: "Flow rate" })
  flowRate?: number;

  @ApiProperty({ description: "Seat leakage class" })
  seatLeakageClass?: string;

  @ApiProperty({ description: "Fire safe standard" })
  fireSafeStandard?: string;

  @ApiProperty({ description: "Cryogenic service" })
  cryogenicService: string;

  @ApiProperty({ description: "Fugitive emissions" })
  fugitiveEmissions: string;

  @ApiProperty({ description: "Extended bonnet" })
  extendedBonnet: string;

  @ApiProperty({ description: "Certifications" })
  certifications: string[];

  @ApiProperty({ description: "Quantity" })
  quantityValue: number;

  @ApiProperty({ description: "Supplier reference" })
  supplierReference?: string;

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
