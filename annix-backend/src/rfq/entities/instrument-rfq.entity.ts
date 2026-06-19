import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export enum InstrumentCategory {
  FLOW = "flow",
  PRESSURE = "pressure",
  LEVEL = "level",
  TEMPERATURE = "temperature",
  ANALYTICAL = "analytical",
}

export class InstrumentRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Instrument type", example: "mag_flowmeter" })
  instrumentType: string;

  @ApiProperty({ description: "Instrument category", enum: InstrumentCategory })
  instrumentCategory: InstrumentCategory;

  @ApiProperty({ description: "Size in DN", example: "100" })
  size?: string;

  @ApiProperty({ description: "Process connection type" })
  processConnection: string;

  @ApiProperty({ description: "Wetted parts material" })
  wettedMaterial: string;

  @ApiProperty({ description: "Measurement range minimum" })
  rangeMin?: number;

  @ApiProperty({ description: "Measurement range maximum" })
  rangeMax?: number;

  @ApiProperty({ description: "Range unit", example: "m3_h" })
  rangeUnit?: string;

  @ApiProperty({ description: "Output signal type", example: "4_20ma" })
  outputSignal: string;

  @ApiProperty({
    description: "Communication protocol",
    example: "4_20ma_hart",
  })
  communicationProtocol?: string;

  @ApiProperty({ description: "Display type", example: "local_lcd" })
  displayType: string;

  @ApiProperty({ description: "Power supply type", example: "loop_powered" })
  powerSupply: string;

  @ApiProperty({ description: "Cable entry type", example: "m20" })
  cableEntry: string;

  @ApiProperty({
    description: "Explosion proof classification",
    example: "ex_ia",
  })
  explosionProof: string;

  @ApiProperty({ description: "IP rating", example: "ip65" })
  ipRating: string;

  @ApiProperty({ description: "Accuracy class", example: "class_0_5" })
  accuracyClass?: string;

  @ApiProperty({ description: "Calibration type", example: "standard" })
  calibration: string;

  @ApiProperty({ description: "Process media" })
  processMedia: string;

  @ApiProperty({ description: "Operating pressure in bar" })
  operatingPressure?: number;

  @ApiProperty({ description: "Operating temperature in Celsius" })
  operatingTemp?: number;

  @ApiProperty({ description: "Quantity value", example: 1 })
  quantityValue: number;

  @ApiProperty({ description: "Supplier reference" })
  supplierReference?: string;

  @ApiProperty({ description: "Model number" })
  modelNumber?: string;

  @ApiProperty({ description: "Unit cost from supplier" })
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", example: 15.0 })
  markupPercentage: number;

  @ApiProperty({ description: "Unit cost in Rand" })
  unitCost?: number;

  @ApiProperty({ description: "Total cost in Rand" })
  totalCost?: number;

  @ApiProperty({ description: "Additional notes" })
  notes?: string;

  @ApiProperty({ description: "Calculation data as JSON" })
  calculationData?: Record<string, any>;

  rfqItem: RfqItem;

  createdAt: Date;

  updatedAt: Date;
}
