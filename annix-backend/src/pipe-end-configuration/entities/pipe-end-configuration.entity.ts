import { WeldType } from "../../weld-type/entities/weld-type.entity";

export class PipeEndConfiguration {
  id: number;

  config_code: string; // e.g. "PE", "FOE", "FBE", "FOE_LF", "FOE_RF", "2X_RF"

  config_name: string; // e.g. "Plain ended", "Flanged both ends"

  weld_count: number; // Number of welds required

  description: string; // Detailed description

  // Item type applicability
  applies_to_pipe: boolean;

  applies_to_bend: boolean;

  applies_to_fitting: boolean;

  // Tack weld configuration
  has_tack_welds: boolean;

  tack_weld_count_per_flange: number;

  tack_weld_length_mm: number;

  // Flange configuration (end 1 = inlet, end 2 = outlet, end 3 = branch/stub)
  has_fixed_flange_end1: boolean;

  has_fixed_flange_end2: boolean;

  has_fixed_flange_end3: boolean;

  has_loose_flange_end1: boolean;

  has_loose_flange_end2: boolean;

  has_loose_flange_end3: boolean;

  has_rotating_flange_end1: boolean;

  has_rotating_flange_end2: boolean;

  has_rotating_flange_end3: boolean;

  // Computed counts
  total_flanges: number;

  bolt_sets_per_config: number;

  // Stub flange code formatting (for fittings)
  stub_flange_code: string;

  created_at: Date;

  updated_at: Date;

  weldType: WeldType;
}
