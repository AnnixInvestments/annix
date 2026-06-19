import { ReturnSession } from "./return-session.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class RubberOffcutReturn {
  id: number;

  returnSession: ReturnSession;

  returnSessionId: number;

  companyId: number;

  sourceIssuanceRowId: number | null;

  sourceRubberRollId: number | null;

  offcutNumber: string | null;

  widthMm: number;

  lengthM: number;

  thicknessMm: number;

  computedWeightKg: number | null;

  compoundId: number | null;

  compoundCode: string | null;

  colour: string | null;

  photoUrl: string | null;

  createsOffcutProductId: number | null;

  notes: string | null;

  createdAt: Date;
}
