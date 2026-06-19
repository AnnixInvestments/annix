import { CoatingSpecification } from "./coating-specification.entity";
import { CoatingStandard } from "./coating-standard.entity";

export class CoatingEnvironment {
  id: number;

  standard: CoatingStandard;

  standardId: number;

  category: string; // e.g., "C1", "C2", "C3", "C4", "C5", "CX", "Im1-Im3"

  description: string;

  surfacePreparation: string;

  specifications: CoatingSpecification[];
}
