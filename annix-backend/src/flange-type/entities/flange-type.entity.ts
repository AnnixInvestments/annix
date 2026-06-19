export class FlangeType {
  id: number;

  code: string; // e.g., "/1", "/2", "/3"

  name: string; // e.g., "Weld Neck", "Slip-On"

  abbreviation: string; // e.g., "WN", "SO", "SW"

  description: string | null;

  standardReference: string | null; // e.g., "ASME B16.5"
}
