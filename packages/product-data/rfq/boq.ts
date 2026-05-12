export interface ConsolidatedItemDto {
  description: string;
  qty: number;
  unit: string;
  weightKg: number;
  entries: number[];
  // Total weld length per type in linear metres (count × circumference).
  welds?: {
    pipeWeld?: number;
    flangeWeld?: number;
    mitreWeld?: number;
    teeWeld?: number;
    gussetTeeWeld?: number;
    latWeld45Plus?: number;
    latWeldUnder45?: number;
  };
  // Number of welds per type (integer count, parallel to `welds` lengths).
  // Suppliers price welding both per-metre (length) AND per-joint (count).
  weldCounts?: {
    pipeWeld?: number;
    flangeWeld?: number;
    mitreWeld?: number;
    teeWeld?: number;
    gussetTeeWeld?: number;
    latWeld45Plus?: number;
    latWeldUnder45?: number;
  };
  areas?: {
    intAreaM2?: number;
    extAreaM2?: number;
  };
}

export interface ConsolidatedBoqDataDto {
  straightPipes?: ConsolidatedItemDto[];
  bends?: ConsolidatedItemDto[];
  tees?: ConsolidatedItemDto[];
  reducers?: ConsolidatedItemDto[];
  flanges?: ConsolidatedItemDto[];
  blankFlanges?: ConsolidatedItemDto[];
  bnwSets?: ConsolidatedItemDto[];
  gaskets?: ConsolidatedItemDto[];
  // HDPE butt-fusion stub-ends paired with backing flanges — one per
  // HDPE-pipe flange end. Suppliers price them separately because
  // they are a fittings-house item, not a flange-house item.
  hdpeStubs?: ConsolidatedItemDto[];
  surfaceProtection?: ConsolidatedItemDto[];
  hdpePipes?: ConsolidatedItemDto[];
  pvcPipes?: ConsolidatedItemDto[];
  // PVC stub-flange adapters paired with backing rings (the
  // PVC analog of HDPE Stub Ends). Less common than HDPE stubs
  // because most PVC flanging is direct slip-on, but kept as a
  // distinct section for the cases that need it.
  pvcStubs?: ConsolidatedItemDto[];
  // PVC slip / RRJ / repair couplings — priced separately by
  // suppliers from straight pipe + fittings.
  pvcCouplings?: ConsolidatedItemDto[];
  structuralSteel?: ConsolidatedItemDto[];
  valves?: ConsolidatedItemDto[];
  instruments?: ConsolidatedItemDto[];
  actuators?: ConsolidatedItemDto[];
  flowMeters?: ConsolidatedItemDto[];
  pressureInstruments?: ConsolidatedItemDto[];
  levelInstruments?: ConsolidatedItemDto[];
  temperatureInstruments?: ConsolidatedItemDto[];
  pumps?: ConsolidatedItemDto[];
  pumpParts?: ConsolidatedItemDto[];
  pumpSpares?: ConsolidatedItemDto[];
}

export interface SubmitBoqDto {
  boqData: ConsolidatedBoqDataDto;
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  projectInfo?: {
    name: string;
    description?: string;
    requiredDate?: string;
  };
}

export interface SubmitBoqResponseDto {
  boqId: number;
  boqNumber: string;
  sectionsCreated: number;
  suppliersNotified: number;
  sectionsSummary: {
    sectionType: string;
    sectionTitle: string;
    itemCount: number;
    totalWeightKg: number;
  }[];
}

export interface CreateBoqDto {
  title: string;
  description?: string;
  rfqId?: number;
}

export interface BoqResponse {
  id: number;
  boqNumber: string;
  title: string;
  status: string;
}
