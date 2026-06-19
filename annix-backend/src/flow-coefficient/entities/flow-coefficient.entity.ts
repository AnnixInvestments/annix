export class FlowCoefficient {
  id: number;

  material: string;

  condition: string;

  hazenWilliamsC: number;

  manningN: number | null;

  absoluteRoughnessMm: number | null;

  notes: string | null;
}
