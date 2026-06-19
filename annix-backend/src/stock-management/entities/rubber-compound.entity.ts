export type RubberCompoundFamily =
  | "NR"
  | "SBR"
  | "NBR"
  | "EPDM"
  | "CR"
  | "FKM"
  | "IIR"
  | "BR"
  | "CSM"
  | "PU"
  | "other";

export type RubberCompoundDatasheetStatus =
  | "missing"
  | "pending_upload"
  | "uploaded"
  | "extracted"
  | "verified";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class RubberCompound {
  id: number;

  companyId: number;

  code: string;

  name: string;

  supplierId: number | null;

  supplierName: string | null;

  compoundFamily: RubberCompoundFamily;

  shoreHardness: number | null;

  densityKgPerM3: number | null;

  specificGravity: number | null;

  tempRangeMinC: number | null;

  tempRangeMaxC: number | null;

  elongationAtBreakPct: number | null;

  tensileStrengthMpa: number | null;

  chemicalResistance: string[] | null;

  defaultColour: string | null;

  datasheetStatus: RubberCompoundDatasheetStatus;

  lastExtractionDatasheetId: number | null;

  legacyFirebaseUid: string | null;

  notes: string | null;

  active: boolean;

  createdAt: Date;

  updatedAt: Date;
}
