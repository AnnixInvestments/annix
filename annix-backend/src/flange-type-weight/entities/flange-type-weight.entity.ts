import { FlangeStandard } from "../../flange-standard/entities/flange-standard.entity";

export class FlangeTypeWeight {
  id: number;

  flange_standard_id: number | null;

  flangeStandard: FlangeStandard | null;

  pressure_class: string;

  flange_type_code: string;

  nominal_bore_mm: number;

  weight_kg: number;

  created_at: Date;

  updated_at: Date;
}
