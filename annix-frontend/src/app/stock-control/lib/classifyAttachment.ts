export type StagedAttachmentType = "drawing" | "qc_document";

export interface HeuristicAttachmentResult {
  type: StagedAttachmentType;
  ambiguous: boolean;
}

const QC_PHRASES = ["test plan", "data book", "data sheet", "mill cert"];
const QC_WORDS = ["itp", "inspection", "qcp", "certificate", "cert", "coc", "coa", "datasheet"];

const DRAWING_PHRASES: string[] = [];
const DRAWING_WORDS = [
  "ga",
  "drawing",
  "drg",
  "dwg",
  "rev",
  "detail",
  "assembly",
  "fabrication",
  "tank",
  "cyclone",
  "distributor",
  "underflow",
  "overflow",
  "lid",
  "dxf",
];

const DRAWING_NUMBER_PATTERNS = [/\bcd\d/, /\b[a-z]{2,3}\d{2,}/];

export function heuristicAttachmentType(filename: string): HeuristicAttachmentResult {
  const lower = (filename || "").toLowerCase();
  const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
  const wordSet = new Set(words);

  const matchesPhrase = (phrases: string[]) => phrases.some((phrase) => lower.includes(phrase));
  const matchesWord = (list: string[]) => list.some((word) => wordSet.has(word));
  const matchesPattern = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(lower));

  const isQc = matchesPhrase(QC_PHRASES) || matchesWord(QC_WORDS);
  const isDrawing =
    matchesPhrase(DRAWING_PHRASES) ||
    matchesWord(DRAWING_WORDS) ||
    matchesPattern(DRAWING_NUMBER_PATTERNS);

  if (isQc && !isDrawing) return { type: "qc_document", ambiguous: false };
  if (isDrawing && !isQc) return { type: "drawing", ambiguous: false };
  return { type: "drawing", ambiguous: true };
}
