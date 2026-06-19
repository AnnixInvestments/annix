import { ForgedFittingDimension } from "./forged-fitting-dimension.entity";
import { ForgedFittingPtRating } from "./forged-fitting-pt-rating.entity";

export class ForgedFittingSeries {
  id: number;

  pressureClass: number;

  connectionType: string;

  standardCode: string;

  description: string | null;

  dimensions: ForgedFittingDimension[];

  ptRatings: ForgedFittingPtRating[];
}
