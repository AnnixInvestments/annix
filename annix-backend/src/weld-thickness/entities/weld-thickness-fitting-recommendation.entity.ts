export class WeldThicknessFittingRecommendation {
  id: number;

  fitting_type: string; // '45E', '90E', 'TEE', 'BW_RED', 'PIPE'

  fitting_class: string; // 'STD', 'XH', 'XXH'

  nominal_bore_mm: number;

  wall_thickness_mm: number;

  temperature_celsius: number;

  max_pressure_bar: number;

  notes: string;

  created_at: Date;

  updated_at: Date;
}
