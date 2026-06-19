export class GasketWeight {
  id: number;

  gasket_type: string;

  nominal_bore_mm: number;

  weight_kg: number;

  inner_diameter_mm: number | null;

  outer_diameter_mm: number | null;

  thickness_mm: number | null;

  flange_standard: string | null;

  pressure_class: string | null;

  material: string | null;

  created_at: Date;

  updated_at: Date;
}
