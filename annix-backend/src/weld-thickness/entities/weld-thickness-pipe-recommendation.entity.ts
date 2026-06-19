export class WeldThicknessPipeRecommendation {
  id: number;

  steel_type: string; // 'CARBON_STEEL' or 'STAINLESS_STEEL'

  nominal_bore_mm: number;

  schedule: string;

  wall_thickness_mm: number;

  temperature_celsius: number;

  max_pressure_bar: number;

  notes: string;

  created_at: Date;

  updated_at: Date;
}
