import { ForgedFittingDimension } from "./forged-fitting-dimension.entity";

export class ForgedFittingType {
  id: number;

  code: string;

  name: string;

  description: string | null;

  dimensions: ForgedFittingDimension[];
}
