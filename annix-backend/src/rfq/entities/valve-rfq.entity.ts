import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
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

@Entity("valve_rfqs")
export class ValveRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Valve type", example: "ball_valve" })
  @Column({ name: "valve_type", type: "varchar", length: 100 })
  valveType: string;

  @ApiProperty({ description: "Valve category", enum: ValveCategory })
  @Column({
    name: "valve_category",
    type: "enum",
    enum: ValveCategory,
    nullable: true,
  })
  valveCategory?: ValveCategory;

  @ApiProperty({ description: "Valve size in DN", example: "100" })
  @Column({ name: "size", type: "varchar", length: 20 })
  size: string;

  @ApiProperty({ description: "Pressure class", example: "class_150" })
  @Column({ name: "pressure_class", type: "varchar", length: 50 })
  pressureClass: string;

  @ApiProperty({ description: "End connection type", example: "flanged_rf" })
  @Column({ name: "connection_type", type: "varchar", length: 50 })
  connectionType: string;

  @ApiProperty({ description: "Body material", example: "cf8m" })
  @Column({ name: "body_material", type: "varchar", length: 50 })
  bodyMaterial: string;

  @ApiProperty({ description: "Trim material", example: "ss_316" })
  @Column({ name: "trim_material", type: "varchar", length: 50, nullable: true })
  trimMaterial?: string;

  @ApiProperty({ description: "Seat/seal material", example: "ptfe" })
  @Column({ name: "seat_material", type: "varchar", length: 50 })
  seatMaterial: string;

  @ApiProperty({ description: "Port type", example: "full_port" })
  @Column({ name: "port_type", type: "varchar", length: 50, nullable: true })
  portType?: string;

  @ApiProperty({ description: "Actuator type", enum: ValveActuatorType })
  @Column({
    name: "actuator_type",
    type: "enum",
    enum: ValveActuatorType,
    default: ValveActuatorType.MANUAL_LEVER,
  })
  actuatorType: ValveActuatorType;

  @ApiProperty({ description: "Air supply pressure in bar" })
  @Column({
    name: "air_supply",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  airSupply?: number;

  @ApiProperty({ description: "Voltage for electric actuators" })
  @Column({ name: "voltage", type: "varchar", length: 20, nullable: true })
  voltage?: string;

  @ApiProperty({ description: "Fail position", enum: ValveFailPosition })
  @Column({
    name: "fail_position",
    type: "enum",
    enum: ValveFailPosition,
    nullable: true,
  })
  failPosition?: ValveFailPosition;

  @ApiProperty({ description: "Positioner type" })
  @Column({ name: "positioner", type: "varchar", length: 50, nullable: true })
  positioner?: string;

  @ApiProperty({ description: "Has limit switches" })
  @Column({ name: "limit_switches", type: "boolean", default: false })
  limitSwitches: boolean;

  @ApiProperty({ description: "Has solenoid valve" })
  @Column({ name: "solenoid_valve", type: "boolean", default: false })
  solenoidValve: boolean;

  @ApiProperty({ description: "Process media" })
  @Column({ name: "media", type: "varchar", length: 255 })
  media: string;

  @ApiProperty({ description: "Operating pressure in bar" })
  @Column({
    name: "operating_pressure",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  operatingPressure?: number;

  @ApiProperty({ description: "Operating temperature in Celsius" })
  @Column({
    name: "operating_temp",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  operatingTemp?: number;

  @ApiProperty({ description: "Hazardous area classification" })
  @Column({
    name: "hazardous_area",
    type: "varchar",
    length: 50,
    default: "none",
  })
  hazardousArea: string;

  @ApiProperty({ description: "Flow coefficient Cv" })
  @Column({
    name: "cv",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  cv?: number;

  @ApiProperty({ description: "Flow rate in m3/h" })
  @Column({
    name: "flow_rate",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  flowRate?: number;

  @ApiProperty({ description: "Seat leakage class" })
  @Column({
    name: "seat_leakage_class",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  seatLeakageClass?: string;

  @ApiProperty({ description: "Fire safe standard" })
  @Column({
    name: "fire_safe_standard",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  fireSafeStandard?: string;

  @ApiProperty({ description: "Cryogenic service type" })
  @Column({
    name: "cryogenic_service",
    type: "varchar",
    length: 50,
    default: "standard",
  })
  cryogenicService: string;

  @ApiProperty({ description: "Fugitive emissions standard" })
  @Column({
    name: "fugitive_emissions",
    type: "varchar",
    length: 50,
    default: "none",
  })
  fugitiveEmissions: string;

  @ApiProperty({ description: "Extended bonnet type" })
  @Column({
    name: "extended_bonnet",
    type: "varchar",
    length: 50,
    default: "standard",
  })
  extendedBonnet: string;

  @ApiProperty({ description: "Certifications as array" })
  @Column({
    name: "certifications",
    type: "text",
    array: true,
    default: "{}",
  })
  certifications: string[];

  @ApiProperty({ description: "Quantity value", example: 1 })
  @Column({
    name: "quantity_value",
    type: "int",
    default: 1,
  })
  quantityValue: number;

  @ApiProperty({ description: "Supplier reference" })
  @Column({
    name: "supplier_reference",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  supplierReference?: string;

  @ApiProperty({ description: "Unit cost from supplier" })
  @Column({
    name: "unit_cost_from_supplier",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", example: 15.0 })
  @Column({
    name: "markup_percentage",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 15.0,
  })
  markupPercentage: number;

  @ApiProperty({ description: "Unit cost in Rand" })
  @Column({
    name: "unit_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitCost?: number;

  @ApiProperty({ description: "Total cost in Rand" })
  @Column({
    name: "total_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalCost?: number;

  @ApiProperty({ description: "Additional notes" })
  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  @ApiProperty({ description: "Calculation data as JSON" })
  @Column({ name: "calculation_data", type: "jsonb", nullable: true })
  calculationData?: Record<string, any>;

  @OneToOne(
    () => RfqItem,
    (rfqItem) => rfqItem.valveDetails,
  )
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
