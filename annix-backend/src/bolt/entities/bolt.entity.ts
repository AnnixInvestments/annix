import { BoltMass } from "../../bolt-mass/entities/bolt-mass.entity";
import { NutMass } from "../../nut-mass/entities/nut-mass.entity";

export class Bolt {
  id: number;

  designation: string;

  grade: string | null;

  material: string | null;

  headStyle: string | null;

  threadType: string | null;

  threadPitchMm: number | null;

  finish: string | null;

  standard: string | null;

  category: string | null;

  driveType: string | null;

  pointType: string | null;

  boltMasses: BoltMass[];

  nutsMasses: NutMass[];
}
