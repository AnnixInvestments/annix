const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? 0 : Number(value)),
};

const numericTransformerNullable = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class RubberWastageBin {
  id: number;

  companyId: number;

  colour: string;

  currentWeightKg: number;

  currentValueR: number;

  locationId: number | null;

  scrapRatePerKgR: number | null;

  lastEmptiedAt: Date | null;

  lastEmptiedValueR: number | null;

  active: boolean;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
