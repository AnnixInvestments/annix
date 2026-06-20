import type { PaintCoatRole, PaintGenericType } from "../entities/paint-price-list-item.entity";

export interface CoatingSystemSpecInput {
  system: string;
  coats: string;
  totalDftUmRange: string;
  primerType: string | null;
  primerNdftUm: string | null;
  binderType: string | null;
  subsequentBinder: string | null;
}

export interface DerivedCoat {
  role: PaintCoatRole;
  genericType: PaintGenericType | null;
  microns: number | null;
}

export interface CoatingSystemOption {
  category: string;
  description: string;
  systemCode: string | null;
  systemLabel: string;
  totalDftUm: number | null;
  coats: DerivedCoat[];
}

const KEYWORD_RULES: { pattern: RegExp; type: PaintGenericType }[] = [
  { pattern: /coal[\s-]?tar/i, type: "coal-tar-epoxy" },
  { pattern: /glass[\s-]?flake/i, type: "epoxy-glass-flake" },
  { pattern: /\bmio\b|micaceous/i, type: "epoxy-mio" },
  { pattern: /mastic/i, type: "epoxy-mastic" },
  { pattern: /phenolic/i, type: "epoxy-phenolic" },
  { pattern: /poly[\s-]?siloxane|siloxane/i, type: "polysiloxane" },
  { pattern: /poly[\s-]?urea/i, type: "polyurea" },
  { pattern: /poly[\s-]?urethane|\bpur\b|\bpu\b/i, type: "polyurethane" },
  { pattern: /zinc[\s-]?rich|\bzn\s*\(?\s*r\s*\)?/i, type: "zinc-rich-epoxy" },
  {
    pattern: /ethyl\s*silicate|zinc\s*silicate|inorganic\s*zinc|\besi\b|\bzn\s*\(?\s*i\s*\)?/i,
    type: "zinc-silicate",
  },
  { pattern: /acrylic|\bay\b/i, type: "acrylic" },
  { pattern: /alkyd|\bak\b/i, type: "alkyd" },
  { pattern: /vinyl|\bpvc\b/i, type: "vinyl" },
  { pattern: /bitumen|bituminous/i, type: "bitumen" },
  { pattern: /intumescent/i, type: "intumescent" },
  { pattern: /\bfbe\b|fusion[\s-]?bond/i, type: "fbe" },
  { pattern: /3[\s-]?lpe/i, type: "3lpe" },
  { pattern: /high[\s-]?temp|silicone/i, type: "high-temp-silicone" },
  { pattern: /epoxy|\bep\b/i, type: "epoxy" },
];

const TOPCOAT_PRIORITY: PaintGenericType[] = [
  "polysiloxane",
  "polyurethane",
  "acrylic",
  "vinyl",
  "high-temp-silicone",
  "epoxy-mio",
  "epoxy",
  "alkyd",
  "bitumen",
];

const INTERMEDIATE_PRIORITY: PaintGenericType[] = [
  "epoxy-mio",
  "epoxy-glass-flake",
  "epoxy-mastic",
  "epoxy-phenolic",
  "coal-tar-epoxy",
  "epoxy",
  "polyurethane",
  "acrylic",
  "alkyd",
];

function genericsInOrder(text: string | null): PaintGenericType[] {
  if (!text) {
    return [];
  }
  const tokens = text.split(/[/,+]/).map((token) => token.trim());
  const found = tokens
    .map((token) => {
      const rule = KEYWORD_RULES.find((candidate) => candidate.pattern.test(token));
      return rule ? rule.type : null;
    })
    .filter((value): value is PaintGenericType => value !== null);
  return Array.from(new Set(found));
}

function pickByPriority(
  candidates: PaintGenericType[],
  priority: PaintGenericType[],
): PaintGenericType | null {
  const preferred = priority.find((type) => candidates.includes(type));
  if (preferred) {
    return preferred;
  }
  return candidates.length > 0 ? candidates[0] : null;
}

function parseNumbers(text: string | null): number[] {
  if (!text) {
    return [];
  }
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return matches ? matches.map((value) => Number(value)) : [];
}

function midOfRange(text: string | null): number | null {
  const numbers = parseNumbers(text);
  if (numbers.length === 0) {
    return null;
  }
  if (numbers.length === 1) {
    return numbers[0];
  }
  return Math.round((numbers[0] + numbers[numbers.length - 1]) / 2);
}

function roundToFive(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}

function coatCount(coats: string): number {
  const numbers = parseNumbers(coats);
  if (numbers.length === 0) {
    return 3;
  }
  const highest = Math.max(...numbers);
  return Math.min(3, Math.max(1, highest));
}

function distributeMicrons(total: number | null, primer: number | null, slots: number): number[] {
  if (total == null || total <= 0) {
    const fallback = primer != null && primer > 0 ? primer : 75;
    return Array.from({ length: slots }, () => fallback);
  }
  const primerMicrons =
    primer != null && primer > 0
      ? Math.min(primer, Math.round(total * 0.5))
      : roundToFive(total * 0.3);
  if (slots === 1) {
    return [total];
  }
  const remaining = Math.max(total - primerMicrons, slots * 25);
  if (slots === 2) {
    return [primerMicrons, roundToFive(remaining)];
  }
  const intermediate = roundToFive(remaining * 0.55);
  const final = roundToFive(remaining - intermediate);
  return [primerMicrons, intermediate, final];
}

function primerGenericType(
  spec: CoatingSystemSpecInput,
  segments: string[],
): PaintGenericType | null {
  const fromPrimerType = genericsInOrder(spec.primerType);
  const concrete = fromPrimerType.find((type) => type !== null);
  if (concrete) {
    return concrete;
  }
  const primerSegment = segments.length > 0 ? segments[0] : spec.system;
  const fromSegment = genericsInOrder(primerSegment);
  if (fromSegment.length > 0) {
    return fromSegment[0];
  }
  const fromBinder = genericsInOrder(spec.binderType);
  return fromBinder.length > 0 ? fromBinder[0] : null;
}

export function deriveCoatingSystemCoats(spec: CoatingSystemSpecInput): DerivedCoat[] {
  const segments = spec.system
    ? spec.system
        .split("+")
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0)
    : [];
  const slots = coatCount(spec.coats);

  const primer = primerGenericType(spec, segments);

  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : "";
  const subsequentGenerics = genericsInOrder(spec.subsequentBinder);
  const lastSegmentGenerics = genericsInOrder(lastSegment);
  const finalCandidates = lastSegmentGenerics.length > 0 ? lastSegmentGenerics : subsequentGenerics;
  const finalType = pickByPriority(finalCandidates, TOPCOAT_PRIORITY);

  const middleSegment =
    segments.length >= 3 ? segments[1] : segments.length === 2 ? segments[1] : "";
  const middleGenerics = genericsInOrder(middleSegment);
  const intermediateCandidates = middleGenerics.length > 0 ? middleGenerics : subsequentGenerics;
  const intermediateType = pickByPriority(intermediateCandidates, INTERMEDIATE_PRIORITY);

  const total = midOfRange(spec.totalDftUmRange);
  const primerMicrons = midOfRange(spec.primerNdftUm);
  const microns = distributeMicrons(total, primerMicrons, slots);

  if (slots === 1) {
    return [{ role: "primer", genericType: primer, microns: microns[0] }];
  }
  if (slots === 2) {
    return [
      { role: "primer", genericType: primer, microns: microns[0] },
      { role: "final", genericType: finalType, microns: microns[1] },
    ];
  }
  return [
    { role: "primer", genericType: primer, microns: microns[0] },
    { role: "intermediate", genericType: intermediateType, microns: microns[1] },
    { role: "final", genericType: finalType, microns: microns[2] },
  ];
}

export function totalDftFromRange(text: string): number | null {
  return midOfRange(text);
}
