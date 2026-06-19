import { SteelSpecification } from "../../steel-specification/entities/steel-specification.entity";

export class MaterialLimit {
  id: number;

  steel_specification_id: number;

  specification_pattern: string;

  material_type: string;

  min_temp_c: number;

  max_temp_c: number;

  max_pressure_bar: number;

  asme_p_number: string;

  asme_group_number: string;

  default_grade: string;

  notes: string;

  is_seamless: boolean;

  is_welded: boolean;

  standard_code: string;

  created_at: Date;

  steelSpecification: SteelSpecification;
}
