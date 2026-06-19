import { RubberType } from "./rubber-type.entity";

export class RubberChemicalCompatibility {
  id: number;

  rubberTypeId: number;

  rubberType: RubberType;

  chemical: string;

  concentration: string | null;

  temperatureC: number;

  rating: string;

  isoTr7620Ref: string | null;

  notes: string | null;
}
