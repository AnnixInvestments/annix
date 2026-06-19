export class PipeSteelGrade {
  id: number;

  code: string; // e.g., "ASTM_A106_Grade_B"

  name: string; // e.g., "ASTM A106 Grade B (Seamless high-temp service)"

  category: string; // "carbon_steel", "stainless_steel", "alloy_steel"

  equivalentGrade: string | null; // For SABS grades that map to ASTM equivalents

  notes: string | null;
}

export class PipeAllowableStress {
  id: number;

  grade: PipeSteelGrade;

  gradeId: number;

  temperatureF: number; // Temperature in Fahrenheit

  allowableStressKsi: number; // Allowable stress in ksi (from ASME B31.3)
}
