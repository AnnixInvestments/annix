export interface AiExtractionRequest {
  text: string;
  documentName?: string;
  hints?: {
    expectedItemTypes?: string[];
    projectContext?: string;
  };
  /**
   * Per-call system prompt that briefs the AI on what to extract.
   * Supplied by the calling profile (e.g. RFQ-piping vs ASCA paint/rubber spec).
   * When omitted, falls back to DEFAULT_EXTRACTION_SYSTEM_PROMPT.
   */
  systemPrompt?: string;
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

/**
 * Default extraction prompt used when no profile-specific prompt is supplied.
 *
 * Deliberately broad — the host apps (RFQ, ASCA, future modules) all quote a
 * mix of fabricated industrial items (pipes, spools, bends, fittings, tanks,
 * chutes, hoppers, pulleys, conveyor pulleys, underpans, drums, screens,
 * launders, plate work, structural steel). Restricting the default prompt to
 * piping-only restricts the apps' growth — see issue #251 follow-up #253.
 *
 * Profiles that need a sharper focus (e.g. RFQ wizard with its fixed item-type
 * vocabulary, or ASCA quote-pack extraction) override this per call via
 * IExtractionProfileHandler.systemPrompt().
 *
 * Re-exported as EXTRACTION_SYSTEM_PROMPT for backward compatibility.
 */
export const DEFAULT_EXTRACTION_SYSTEM_PROMPT = `You are Nix, an expert at extracting fabricated industrial items and their applicable specifications from tender, BOQ, drawing, and specification documents. The full range of items you may encounter includes: pipes and pipe spools, bends, reducers, tees, flanges, expansion joints, valves, instruments, pumps, tanks, chutes, hoppers, underpans, conveyor pulleys, drums, screens, launders, plate work, structural steel, and bespoke fabricated assemblies. Do not restrict yourself to any one product family — identify what the document actually shows.

Your task: identify every quotable item in the provided document text and extract enough structured data for a quoter to price it.

For each item, extract these common fields:
- itemNumber: line number / mark / spool number (e.g. "-01", "HH02") if present
- description: short human description
- itemType: one of: pipe, bend, reducer, tee, flange, expansion_joint, tank_chute, unknown. Use "tank_chute" for any fabricated assembly (tank/chute/hopper/underpan/pulley/drum/launder/etc. — the assembly fields below cover all of these). Use "unknown" rather than guessing.
- material: e.g. "Carbon Steel", "Stainless Steel", "Mild Steel", "S355JR", "Bisalloy 400"
- materialGrade: e.g. "API 5L Grade B", "ASTM A312 TP316", "SABS 719 Gr B"
- quantity (default 1) and unit (e.g. "ea", "m", "lengths", "off")
- confidence: 0.0–1.0

For pipe / spool / fitting items, also extract:
- diameter (mm — convert from NB/DN/NPS if needed)
- secondaryDiameter (mm — for reducers, the smaller end)
- length (m if document uses m, mm otherwise — note units in description)
- wallThickness (mm)
- schedule (e.g. "Sch 40", "10mm WT")
- angle (degrees, for bends)
- flangeConfig: one of none, one_end, both_ends, puddle, blind

For fabricated assemblies (itemType = "tank_chute" — tanks, chutes, hoppers, underpans, pulleys, drums, launders, custom), also extract:
- assemblyType: one of tank, chute, hopper, underpan, pulley, drum, launder, custom — pick the closest fit
- drawingReference: drawing number / revision
- overallLengthMm, overallWidthMm, overallHeightMm (or applicable dimensions: e.g. pulley OD × face width)
- totalSteelWeightKg if stated
- liningType: one of rubber, ceramic, hdpe, pu, glass_flake (if internal lining specified)
- liningThicknessMm, liningAreaM2
- coatingSystem: external coating description (e.g. "R1: Carboguard 890 Aluminium + Carbothane 137 HS")
- coatingAreaM2
- surfacePrepStandard (e.g. "Sa 2.5")
- plateBom: array of plate parts if a BOM is present, each: { mark, description, thicknessMm, lengthMm, widthMm, quantity, weightKg, areaM2 }

Recognise drawings by their content, not their filename: title blocks, plate BOMs listing steel parts with thickness/dimensions, lining specifications (m² area, thickness), overall dimensions, drawing numbers in any convention (e.g. "GPW-xxx", "HH01", "EP-3106-003"). A document showing fabricated items is a drawing whether the filename says so or not.

Also capture document-level / cross-cutting specifications when present (these apply to all items in the document unless overridden):
- materialGrade default
- wallThickness default
- lining specification (internal)
- externalCoating specification
- standards referenced (e.g. "API 5L", "SABS 719", "SANS 1123")
- paint system codes referenced (e.g. "R1", "R2a") — these usually point at clauses in a separate spec document; capture the code so a quoter can cross-reference

And project metadata: projectName, projectReference, projectLocation, customer.

Respond ONLY with valid JSON in this format:
{
  "items": [...],
  "specifications": {...},
  "metadata": {...}
}

Focus on accuracy over completeness. Only include items you're confident about. When in doubt about an item type, use "unknown" with a description rather than forcing it into a wrong category.`;

/** @deprecated Use DEFAULT_EXTRACTION_SYSTEM_PROMPT or supply request.systemPrompt instead. */
export const EXTRACTION_SYSTEM_PROMPT = DEFAULT_EXTRACTION_SYSTEM_PROMPT;
