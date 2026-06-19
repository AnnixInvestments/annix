export class WeldType {
  id: number;

  weld_code: string; // e.g. "FW_STR", "BW_NO_XRAY", "MW"

  weld_name: string; // e.g. "Flange Weld - Straight"

  category: string; // e.g. "FLANGE", "BUTT", "BRANCH"

  description: string; // Detailed description

  created_at: Date;

  updated_at: Date;

  // Note: PipeEndConfiguration relationship will be added when that entity is created
}
