import { RubberSpecification } from "./rubber-specification.entity";

export enum RubberPolymerType {
  TYPE_1 = 1,
  TYPE_2 = 2,
  TYPE_3 = 3,
  TYPE_4 = 4,
  TYPE_5 = 5,
}

export class RubberType {
  id: number;

  typeNumber: number;

  typeName: string;

  polymerCodes: string;

  polymerNames: string;

  description: string;

  tempMinCelsius: number;

  tempMaxCelsius: number;

  ozoneResistance: string;

  oilResistance: string;

  chemicalResistanceNotes: string | null;

  notSuitableFor: string | null;

  typicalApplications: string | null;

  specifications: RubberSpecification[];
}
