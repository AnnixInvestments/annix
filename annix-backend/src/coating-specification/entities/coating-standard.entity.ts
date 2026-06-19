import { CoatingEnvironment } from "./coating-environment.entity";

export class CoatingStandard {
  id: number;

  code: string; // e.g., "ISO 12944", "NORSOK M-501"

  description: string;

  generalSurfacePreparation: string;

  notes: string | null;

  environments: CoatingEnvironment[];
}
