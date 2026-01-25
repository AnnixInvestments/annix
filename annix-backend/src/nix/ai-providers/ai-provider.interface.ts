export interface AiExtractionRequest {
  text: string;
  documentName?: string;
  hints?: {
    expectedItemTypes?: string[];
    projectContext?: string;
  };
}

export interface AiExtractedItem {
  itemNumber?: string;
  description: string;
  itemType:
    | 'pipe'
    | 'bend'
    | 'reducer'
    | 'tee'
    | 'flange'
    | 'expansion_joint'
    | 'unknown';
  material?: string;
  materialGrade?: string;
  diameter?: number;
  diameterUnit?: 'mm' | 'inch';
  secondaryDiameter?: number;
  length?: number;
  wallThickness?: number;
  schedule?: string;
  angle?: number;
  flangeConfig?: 'none' | 'one_end' | 'both_ends' | 'puddle' | 'blind';
  quantity: number;
  unit: string;
  confidence: number;
  rawText?: string;
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

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting pipe and fitting items from tender/BOQ documents for industrial piping projects.

Your task is to identify and extract all pipe-related items from the provided document text.

For each item found, extract:
- itemNumber: The item/line number if present
- description: Brief description of the item
- itemType: One of: pipe, bend, reducer, tee, flange, expansion_joint, unknown
- material: Material type (e.g., "Carbon Steel", "Stainless Steel", "Mild Steel")
- materialGrade: Specific grade (e.g., "API 5L Grade B", "ASTM A312 TP316", "SABS 719")
- diameter: Primary diameter in mm (convert from NB/DN if needed)
- secondaryDiameter: For reducers, the smaller diameter
- length: Length in metres if specified
- wallThickness: Wall thickness in mm if specified
- schedule: Pipe schedule (e.g., "Sch 40", "Sch 80")
- angle: For bends, the angle in degrees
- flangeConfig: One of: none, one_end, both_ends, puddle, blind
- quantity: Number of items (default 1)
- unit: Unit of measure (e.g., "ea", "m", "lengths")
- confidence: Your confidence in this extraction (0.0 to 1.0)

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
