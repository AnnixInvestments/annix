export interface AiExtractionRequest {
  text: string;
  documentName?: string;
  hints?: {
    expectedItemTypes?: string[];
    projectContext?: string;
  };
}

export interface AiExtractedPlateBomRow {
  mark?: string;
  description?: string;
  thicknessMm?: number;
  lengthMm?: number;
  widthMm?: number;
  quantity?: number;
  weightKg?: number;
  areaM2?: number;
}

export interface AiExtractedItem {
  itemNumber?: string;
  description: string;
  itemType:
    | "pipe"
    | "bend"
    | "reducer"
    | "tee"
    | "flange"
    | "expansion_joint"
    | "tank_chute"
    | "unknown";
  material?: string;
  materialGrade?: string;
  diameter?: number;
  diameterUnit?: "mm" | "inch";
  secondaryDiameter?: number;
  length?: number;
  wallThickness?: number;
  schedule?: string;
  angle?: number;
  flangeConfig?: "none" | "one_end" | "both_ends" | "puddle" | "blind";
  quantity: number;
  unit: string;
  confidence: number;
  rawText?: string;
  assemblyType?: "tank" | "chute" | "hopper" | "underpan" | "custom";
  drawingReference?: string;
  overallLengthMm?: number;
  overallWidthMm?: number;
  overallHeightMm?: number;
  totalSteelWeightKg?: number;
  liningType?: "rubber" | "ceramic" | "hdpe" | "pu" | "glass_flake";
  liningThicknessMm?: number;
  liningAreaM2?: number;
  coatingSystem?: string;
  coatingAreaM2?: number;
  surfacePrepStandard?: string;
  plateBom?: AiExtractedPlateBomRow[];
}

export interface AiSpecificationData {
  materialGrade?: string;
  wallThickness?: string;
  lining?: string;
  externalCoating?: string;
  standard?: string;
  schedule?: string;
}

export interface AiExtractionResponse {
  items: AiExtractedItem[];
  specifications?: AiSpecificationData;
  metadata?: {
    projectName?: string;
    projectReference?: string;
    projectLocation?: string;
  };
  tokensUsed?: number;
  processingTimeMs?: number;
}

export interface AiProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  readonly name: string;

  extractItems(request: AiExtractionRequest): Promise<AiExtractionResponse>;

  isAvailable(): Promise<boolean>;
}

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting pipe, fitting, and welded steel plate structure items from tender/BOQ documents for industrial piping and mining projects.

Your task is to identify and extract all items from the provided document text, including pipes, fittings, and welded steel structures (tanks, chutes, hoppers, underpans).

For each item found, extract the common fields:
- itemNumber: The item/line number if present
- description: Brief description of the item
- itemType: One of: pipe, bend, reducer, tee, flange, expansion_joint, tank_chute, unknown
- material: Material type (e.g., "Carbon Steel", "Stainless Steel", "Mild Steel", "S355JR", "Bisalloy 400")
- materialGrade: Specific grade (e.g., "API 5L Grade B", "ASTM A312 TP316", "SABS 719", "S355JR")
- quantity: Number of items (default 1)
- unit: Unit of measure (e.g., "ea", "m", "lengths")
- confidence: Your confidence in this extraction (0.0 to 1.0)

For pipe/fitting items, also extract:
- diameter: Primary diameter in mm (convert from NB/DN if needed)
- secondaryDiameter: For reducers, the smaller diameter
- length: Length in metres if specified
- wallThickness: Wall thickness in mm if specified
- schedule: Pipe schedule (e.g., "Sch 40", "Sch 80")
- angle: For bends, the angle in degrees
- flangeConfig: One of: none, one_end, both_ends, puddle, blind

For tank/chute/hopper/underpan items (itemType = "tank_chute"), also extract:
- assemblyType: One of: tank, chute, hopper, underpan, custom
- drawingReference: Drawing number or reference
- overallLengthMm: Overall length in mm
- overallWidthMm: Overall width in mm
- overallHeightMm: Overall height/depth in mm
- totalSteelWeightKg: Total steel weight in kg if stated
- liningType: One of: rubber, ceramic, hdpe, pu, glass_flake (if internal lining is specified)
- liningThicknessMm: Lining thickness in mm
- liningAreaM2: Lining surface area in m²
- coatingSystem: External coating system description
- coatingAreaM2: External coating area in m²
- surfacePrepStandard: Surface preparation standard (e.g., "Sa 2.5")
- plateBom: Array of plate parts if a Bill of Materials is present, each with:
  { mark, description, thicknessMm, lengthMm, widthMm, quantity, weightKg, areaM2 }

Recognise tank/chute drawings by: title block references to tanks/chutes/hoppers/underpans, plate BOM tables listing steel plate parts with thickness/dimensions, rubber lining specifications (m² area, thickness), overall assembly dimensions, and drawing numbers like "GPW-xxx" or similar fabrication drawing conventions.

Also extract document-level specifications if present:
- materialGrade: Default material grade for the project
- wallThickness: Default wall thickness
- lining: Internal lining specification
- externalCoating: External coating specification
- standard: Applicable standard (e.g., "API 5L", "SABS 719")

And project metadata:
- projectName: Name of the project
- projectReference: Reference/tender number
- projectLocation: Site location

Respond ONLY with valid JSON in this format:
{
  "items": [...],
  "specifications": {...},
  "metadata": {...}
}

Focus on accuracy over completeness. Only include items you're confident about.`;
