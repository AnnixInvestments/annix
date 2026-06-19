import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export enum ValveCategory {
  ISOLATION = "isolation",
  CONTROL = "control",
  CHECK = "check",
  SAFETY = "safety",
  SPECIALTY = "specialty",
}

export enum ValveActuatorType {
  MANUAL_LEVER = "manual_lever",
  MANUAL_GEAR = "manual_gear",
  MANUAL_HANDWHEEL = "manual_handwheel",
  PNEUMATIC_DA = "pneumatic_da",
  PNEUMATIC_SR_FO = "pneumatic_sr_fo",
  PNEUMATIC_SR_FC = "pneumatic_sr_fc",
  ELECTRIC_ON_OFF = "electric_on_off",
  ELECTRIC_MODULATING = "electric_modulating",
  HYDRAULIC = "hydraulic",
  ELECTRO_HYDRAULIC = "electro_hydraulic",
  SOLENOID = "solenoid",
  SELF_ACTUATED = "self_actuated",
}

export enum ValveFailPosition {
  FAIL_OPEN = "fail_open",
  FAIL_CLOSE = "fail_close",
  FAIL_LAST = "fail_last",
}

export class ValveRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Valve type", example: "ball_valve" })
  valveType: string;

  @ApiProperty({ description: "Valve category", enum: ValveCategory })
  valveCategory?: ValveCategory;

  @ApiProperty({ description: "Valve size in DN", example: "100" })
  size: string;

  @ApiProperty({ description: "Pressure class", example: "class_150" })
  pressureClass: string;

  @ApiProperty({ description: "End connection type", example: "flanged_rf" })
  connectionType: string;

  @ApiProperty({ description: "Body material", example: "cf8m" })
  bodyMaterial: string;

  @ApiProperty({ description: "Trim material", example: "ss_316" })
  trimMaterial?: string;

  @ApiProperty({ description: "Seat/seal material", example: "ptfe" })
  seatMaterial: string;

  @ApiProperty({ description: "Port type", example: "full_port" })
  portType?: string;

  @ApiProperty({ description: "Actuator type", enum: ValveActuatorType })
  actuatorType: ValveActuatorType;

  @ApiProperty({ description: "Air supply pressure in bar" })
  airSupply?: number;

  @ApiProperty({ description: "Voltage for electric actuators" })
  voltage?: string;

  @ApiProperty({ description: "Fail position", enum: ValveFailPosition })
  failPosition?: ValveFailPosition;

  @ApiProperty({ description: "Positioner type" })
  positioner?: string;

  @ApiProperty({ description: "Has limit switches" })
  limitSwitches: boolean;

  @ApiProperty({ description: "Has solenoid valve" })
  solenoidValve: boolean;

  @ApiProperty({ description: "Process media" })
  media: string;

  @ApiProperty({ description: "Operating pressure in bar" })
  operatingPressure?: number;

  @ApiProperty({ description: "Operating temperature in Celsius" })
  operatingTemp?: number;

  @ApiProperty({ description: "Hazardous area classification" })
  hazardousArea: string;

  @ApiProperty({ description: "Flow coefficient Cv" })
  cv?: number;

  @ApiProperty({ description: "Flow rate in m3/h" })
  flowRate?: number;

  @ApiProperty({ description: "Seat leakage class" })
  seatLeakageClass?: string;

  @ApiProperty({ description: "Fire safe standard" })
  fireSafeStandard?: string;

  @ApiProperty({ description: "Cryogenic service type" })
  cryogenicService: string;

  @ApiProperty({ description: "Fugitive emissions standard" })
  fugitiveEmissions: string;

  @ApiProperty({ description: "Extended bonnet type" })
  extendedBonnet: string;

  @ApiProperty({ description: "Certifications as array" })
  certifications: string[];

  @ApiProperty({ description: "Quantity value", example: 1 })
  quantityValue: number;

  @ApiProperty({ description: "Supplier reference" })
  supplierReference?: string;

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
