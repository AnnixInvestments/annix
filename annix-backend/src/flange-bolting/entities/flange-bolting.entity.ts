import { FlangeStandard } from "../../flange-standard/entities/flange-standard.entity";

export class FlangeBolting {
  id: number;

  standard: FlangeStandard;

  standardId: number;

  pressureClass: string; // e.g., "150", "300", "600"

  nps: string; // e.g., "0.5", "1", "24"

  numBolts: number;

  boltDia: number; // Bolt diameter in inches

  boltLengthDefault: number | null; // Default bolt length (usually for WN flanges)

  boltLengthSoSwTh: number | null; // Bolt length for SO, SW, Threaded flanges

  boltLengthLj: number | null; // Bolt length for Lap Joint flanges

  boltLengthRf: number | null; // Bolt length for Rotating Flanges (with retaining ring)

  boltLengthBl: number | null; // Bolt length for Blind flanges
}
