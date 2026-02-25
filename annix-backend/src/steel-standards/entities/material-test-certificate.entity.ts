import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { type PslLevel } from "./api5l-grade.entity";

export type MtcType = "2.1" | "2.2" | "3.1" | "3.2";

@Entity("material_test_certificates")
@Index(["mtcNumber"])
@Index(["heatNumber"])
@Index(["lotNumber"])
export class MaterialTestCertificate {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "MTC number", example: "MTC-2024-001" })
  @Column({ name: "mtc_number", type: "varchar", length: 100 })
  mtcNumber: string;

  @ApiProperty({ description: "MTC type per EN 10204", example: "3.1" })
  @Column({ name: "mtc_type", type: "varchar", length: 5, nullable: true })
  mtcType: MtcType | null;

  @ApiProperty({ description: "Manufacturer name", example: "Tenaris" })
  @Column({ type: "varchar", length: 100, nullable: true })
  manufacturer: string | null;

  @ApiProperty({ description: "Heat number", example: "H12345" })
  @Column({ name: "heat_number", type: "varchar", length: 50 })
  heatNumber: string;

  @ApiProperty({ description: "Lot number", example: "LOT-001" })
  @Column({ name: "lot_number", type: "varchar", length: 50, nullable: true })
  lotNumber: string | null;

  @ApiProperty({ description: "Material specification", example: "ASTM A106" })
  @Column({ type: "varchar", length: 50 })
  specification: string;

  @ApiProperty({ description: "Material grade", example: "B" })
  @Column({ type: "varchar", length: 20 })
  grade: string;

  @ApiProperty({ description: "Size description", example: '6" SCH 40' })
  @Column({ type: "varchar", length: 50, nullable: true })
  size: string | null;

  @ApiProperty({ description: "Quantity", example: 100 })
  @Column({ type: "int", nullable: true })
  quantity: number | null;

  @ApiProperty({ description: "Carbon %", example: 0.18 })
  @Column({ name: "c_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  cPct: number | null;

  @ApiProperty({ description: "Manganese %", example: 0.85 })
  @Column({ name: "mn_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  mnPct: number | null;

  @ApiProperty({ description: "Phosphorus %", example: 0.012 })
  @Column({ name: "p_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  pPct: number | null;

  @ApiProperty({ description: "Sulfur %", example: 0.008 })
  @Column({ name: "s_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  sPct: number | null;

  @ApiProperty({ description: "Silicon %", example: 0.25 })
  @Column({ name: "si_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  siPct: number | null;

  @ApiProperty({ description: "Chromium %", example: 0.15 })
  @Column({ name: "cr_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  crPct: number | null;

  @ApiProperty({ description: "Molybdenum %", example: 0.05 })
  @Column({ name: "mo_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  moPct: number | null;

  @ApiProperty({ description: "Nickel %", example: 0.1 })
  @Column({ name: "ni_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  niPct: number | null;

  @ApiProperty({ description: "Vanadium %", example: 0.02 })
  @Column({ name: "v_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  vPct: number | null;

  @ApiProperty({ description: "Copper %", example: 0.15 })
  @Column({ name: "cu_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  cuPct: number | null;

  @ApiProperty({ description: "Niobium %", example: 0.01 })
  @Column({ name: "nb_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  nbPct: number | null;

  @ApiProperty({ description: "Titanium %", example: 0.005 })
  @Column({ name: "ti_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  tiPct: number | null;

  @ApiProperty({ description: "Aluminum %", example: 0.02 })
  @Column({ name: "al_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  alPct: number | null;

  @ApiProperty({ description: "Nitrogen %", example: 0.008 })
  @Column({ name: "n_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  nPct: number | null;

  @ApiProperty({ description: "Boron %", example: 0.0005 })
  @Column({ name: "b_pct", type: "decimal", precision: 6, scale: 5, nullable: true })
  bPct: number | null;

  @ApiProperty({ description: "Calculated carbon equivalent", example: 0.35 })
  @Column({ name: "carbon_equivalent", type: "decimal", precision: 4, scale: 3, nullable: true })
  carbonEquivalent: number | null;

  @ApiProperty({ description: "CE formula used", example: "IIW" })
  @Column({ name: "ce_formula_used", type: "varchar", length: 10, nullable: true })
  ceFormulaUsed: string | null;

  @ApiProperty({ description: "Yield strength MPa", example: 320 })
  @Column({ name: "yield_strength_mpa", type: "decimal", precision: 7, scale: 2, nullable: true })
  yieldStrengthMpa: number | null;

  @ApiProperty({ description: "Tensile strength MPa", example: 485 })
  @Column({ name: "tensile_strength_mpa", type: "decimal", precision: 7, scale: 2, nullable: true })
  tensileStrengthMpa: number | null;

  @ApiProperty({ description: "Elongation %", example: 28 })
  @Column({ name: "elongation_pct", type: "decimal", precision: 5, scale: 2, nullable: true })
  elongationPct: number | null;

  @ApiProperty({ description: "Reduction of area %", example: 55 })
  @Column({ name: "reduction_area_pct", type: "decimal", precision: 5, scale: 2, nullable: true })
  reductionAreaPct: number | null;

  @ApiProperty({ description: "Impact test temperature C", example: 0 })
  @Column({ name: "impact_test_temp_c", type: "int", nullable: true })
  impactTestTempC: number | null;

  @ApiProperty({ description: "Impact specimen size", example: "10x10" })
  @Column({ name: "impact_specimen_size", type: "varchar", length: 20, nullable: true })
  impactSpecimenSize: string | null;

  @ApiProperty({ description: "Impact values JSON array", example: "[45, 48, 42]" })
  @Column({ name: "impact_values_j", type: "jsonb", nullable: true })
  impactValuesJ: number[] | null;

  @ApiProperty({ description: "Impact average J", example: 45 })
  @Column({ name: "impact_average_j", type: "decimal", precision: 6, scale: 1, nullable: true })
  impactAverageJ: number | null;

  @ApiProperty({ description: "Hardness HRC", example: 18 })
  @Column({ name: "hardness_hrc", type: "decimal", precision: 4, scale: 1, nullable: true })
  hardnessHrc: number | null;

  @ApiProperty({ description: "Hardness HV", example: 220 })
  @Column({ name: "hardness_hv", type: "int", nullable: true })
  hardnessHv: number | null;

  @ApiProperty({ description: "Hardness HB", example: 200 })
  @Column({ name: "hardness_hb", type: "int", nullable: true })
  hardnessHb: number | null;

  @ApiProperty({ description: "NDT methods performed", example: '["RT", "UT"]' })
  @Column({ name: "ndt_methods_performed", type: "jsonb", nullable: true })
  ndtMethodsPerformed: string[] | null;

  @ApiProperty({ description: "NDT results summary", example: "No defects found" })
  @Column({ name: "ndt_results", type: "text", nullable: true })
  ndtResults: string | null;

  @ApiProperty({ description: "Hydro test pressure bar", example: 150 })
  @Column({
    name: "hydro_test_pressure_bar",
    type: "decimal",
    precision: 7,
    scale: 2,
    nullable: true,
  })
  hydroTestPressureBar: number | null;

  @ApiProperty({ description: "Hydro test result", example: "PASSED" })
  @Column({ name: "hydro_test_result", type: "varchar", length: 20, nullable: true })
  hydroTestResult: string | null;

  @ApiProperty({ description: "PSL level", example: "PSL2" })
  @Column({ name: "psl_level", type: "varchar", length: 5, nullable: true })
  pslLevel: PslLevel | null;

  @ApiProperty({ description: "NACE MR0175 compliant", example: true })
  @Column({ name: "nace_compliant", type: "boolean", nullable: true })
  naceCompliant: boolean | null;

  @ApiProperty({ description: "DNV compliant", example: false })
  @Column({ name: "dnv_compliant", type: "boolean", nullable: true })
  dnvCompliant: boolean | null;

  @ApiProperty({ description: "Third party inspection performed", example: true })
  @Column({ name: "third_party_inspection", type: "boolean", nullable: true })
  thirdPartyInspection: boolean | null;

  @ApiProperty({ description: "Third party inspector name" })
  @Column({ name: "inspector_name", type: "varchar", length: 100, nullable: true })
  inspectorName: string | null;

  @ApiProperty({ description: "Certificate date" })
  @Column({ name: "certificate_date", type: "date", nullable: true })
  certificateDate: Date | null;

  @ApiProperty({ description: "RFQ item ID reference" })
  @Column({ name: "rfq_item_id", type: "int", nullable: true })
  rfqItemId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
