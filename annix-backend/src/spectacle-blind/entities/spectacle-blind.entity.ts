export class SpectacleBlind {
  id: number;

  nps: string; // Nominal Pipe Size

  pressureClass: string; // e.g., "150", "300", "600"

  odBlind: number; // Outside diameter of blind portion

  odSpacer: number; // Outside diameter of spacer portion

  thicknessBlind: number; // Thickness of blind portion

  thicknessSpacer: number; // Thickness of spacer portion

  barWidth: number; // Width of connecting bar

  barThickness: number; // Thickness of connecting bar

  overallLength: number; // Total length of spectacle blind

  handleLength: number | null; // Handle/lifting lug length

  weightKg: number | null; // Weight in kilograms
}
