import { ApiProperty } from "@nestjs/swagger";
import { type PslLevel } from "./api5l-grade.entity";

export type MtcType = "2.1" | "2.2" | "3.1" | "3.2";

export class MaterialTestCertificate {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "MTC number", example: "MTC-2024-001" })
  mtcNumber: string;

  @ApiProperty({ description: "MTC type per EN 10204", example: "3.1" })
  mtcType: MtcType | null;

  @ApiProperty({ description: "Manufacturer name", example: "Tenaris" })
  manufacturer: string | null;

  @ApiProperty({ description: "Heat number", example: "H12345" })
  heatNumber: string;

  @ApiProperty({ description: "Lot number", example: "LOT-001" })
  lotNumber: string | null;

  @ApiProperty({ description: "Material specification", example: "ASTM A106" })
  specification: string;

  @ApiProperty({ description: "Material grade", example: "B" })
  grade: string;

  @ApiProperty({ description: "Size description", example: '6" SCH 40' })
  size: string | null;

  @ApiProperty({ description: "Quantity", example: 100 })
  quantity: number | null;

  @ApiProperty({ description: "Carbon %", example: 0.18 })
  cPct: number | null;

  @ApiProperty({ description: "Manganese %", example: 0.85 })
  mnPct: number | null;

  @ApiProperty({ description: "Phosphorus %", example: 0.012 })
  pPct: number | null;

  @ApiProperty({ description: "Sulfur %", example: 0.008 })
  sPct: number | null;

  @ApiProperty({ description: "Silicon %", example: 0.25 })
  siPct: number | null;

  @ApiProperty({ description: "Chromium %", example: 0.15 })
  crPct: number | null;

  @ApiProperty({ description: "Molybdenum %", example: 0.05 })
  moPct: number | null;

  @ApiProperty({ description: "Nickel %", example: 0.1 })
  niPct: number | null;

  @ApiProperty({ description: "Vanadium %", example: 0.02 })
  vPct: number | null;

  @ApiProperty({ description: "Copper %", example: 0.15 })
  cuPct: number | null;

  @ApiProperty({ description: "Niobium %", example: 0.01 })
  nbPct: number | null;

  @ApiProperty({ description: "Titanium %", example: 0.005 })
  tiPct: number | null;

  @ApiProperty({ description: "Aluminum %", example: 0.02 })
  alPct: number | null;

  @ApiProperty({ description: "Nitrogen %", example: 0.008 })
  nPct: number | null;

  @ApiProperty({ description: "Boron %", example: 0.0005 })
  bPct: number | null;

  @ApiProperty({ description: "Calculated carbon equivalent", example: 0.35 })
  carbonEquivalent: number | null;

  @ApiProperty({ description: "CE formula used", example: "IIW" })
  ceFormulaUsed: string | null;

  @ApiProperty({ description: "Yield strength MPa", example: 320 })
  yieldStrengthMpa: number | null;

  @ApiProperty({ description: "Tensile strength MPa", example: 485 })
  tensileStrengthMpa: number | null;

  @ApiProperty({ description: "Elongation %", example: 28 })
  elongationPct: number | null;

  @ApiProperty({ description: "Reduction of area %", example: 55 })
  reductionAreaPct: number | null;

  @ApiProperty({ description: "Impact test temperature C", example: 0 })
  impactTestTempC: number | null;

  @ApiProperty({ description: "Impact specimen size", example: "10x10" })
  impactSpecimenSize: string | null;

  @ApiProperty({ description: "Impact values JSON array", example: "[45, 48, 42]" })
  impactValuesJ: number[] | null;

  @ApiProperty({ description: "Impact average J", example: 45 })
  impactAverageJ: number | null;

  @ApiProperty({ description: "Hardness HRC", example: 18 })
  hardnessHrc: number | null;

  @ApiProperty({ description: "Hardness HV", example: 220 })
  hardnessHv: number | null;

  @ApiProperty({ description: "Hardness HB", example: 200 })
  hardnessHb: number | null;

  @ApiProperty({ description: "NDT methods performed", example: '["RT", "UT"]' })
  ndtMethodsPerformed: string[] | null;

  @ApiProperty({ description: "NDT results summary", example: "No defects found" })
  ndtResults: string | null;

  @ApiProperty({ description: "Hydro test pressure bar", example: 150 })
  hydroTestPressureBar: number | null;

  @ApiProperty({ description: "Hydro test result", example: "PASSED" })
  hydroTestResult: string | null;

  @ApiProperty({ description: "PSL level", example: "PSL2" })
  pslLevel: PslLevel | null;

  @ApiProperty({ description: "NACE MR0175 compliant", example: true })
  naceCompliant: boolean | null;

  @ApiProperty({ description: "DNV compliant", example: false })
  dnvCompliant: boolean | null;

  @ApiProperty({ description: "Third party inspection performed", example: true })
  thirdPartyInspection: boolean | null;

  @ApiProperty({ description: "Third party inspector name" })
  inspectorName: string | null;

  @ApiProperty({ description: "Certificate date" })
  certificateDate: Date | null;

  @ApiProperty({ description: "RFQ item ID reference" })
  rfqItemId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
