export class MaterialAllowableStress {
  id: number;

  materialCode: string; // e.g., "ASTM_A106_Grade_B", "ASTM_A53_Grade_B", "ASTM_A312_TP304"

  materialName: string; // Human readable name

  temperatureCelsius: number;

  temperatureFahrenheit: number;

  allowableStressKsi: number; // Allowable stress in ksi (1000 psi)

  allowableStressMpa: number; // Allowable stress in MPa

  sourceStandard: string; // Source standard for the stress values
}
