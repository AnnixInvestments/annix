import { AnsiB169FittingDimension } from "./ansi-b16-9-fitting-dimension.entity";

export class AnsiB169FittingType {
  id: number;

  code: string;

  name: string;

  description: string | null;

  dimensions: AnsiB169FittingDimension[];
}
