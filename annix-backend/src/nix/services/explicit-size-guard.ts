export interface SizeGuardedItem {
  description: string;
  diameter: number | null;
  diameterUnit?: "mm" | "inch";
  material: string | null;
}

export interface SizeGuardResult<T extends SizeGuardedItem> {
  item: T;
  corrections: string[];
}

const MIN_NOMINAL_BORE_MM = 10;
const MAX_NOMINAL_BORE_MM = 2000;

const NOMINAL_BORE_PATTERNS = [
  /\bDN\s*(\d{2,4})\b/gi,
  /\b(\d{2,4})\s*NB\b/gi,
  /\bNB\s*(\d{2,4})\b/gi,
  /\b(\d{2,4})\s*mm\s+(?:dia(?:meter)?|nominal)\b/gi,
  /[Ø∅Φφ]\s*(\d{2,4})\b/g,
];

const HOSE_PHRASE_PATTERN = /\b(?:(?:rubber|flexible|slurry|suction|discharge)\s+){0,3}hose\b/i;

// Nominal bores the row's OWN description states, in order of
// appearance ("DN 450 pipe with two DN 100 offtakes" -> [450, 100]).
export function explicitNominalBoresIn(description: string): number[] {
  const text = description || "";
  const bores = NOMINAL_BORE_PATTERNS.flatMap((pattern) =>
    Array.from(text.matchAll(pattern)).map((match) => ({
      bore: Number.parseInt(match[1], 10),
      index: match.index ?? 0,
    })),
  )
    .filter(({ bore }) => bore >= MIN_NOMINAL_BORE_MM && bore <= MAX_NOMINAL_BORE_MM)
    .sort((a, b) => a.index - b.index)
    .map(({ bore }) => bore);
  return bores.filter((bore, idx) => bores.indexOf(bore) === idx);
}

// Issue #294: nested BOQ sub-items inherited the parent paragraph's
// nominal bore and material ("DN 100 flexible spigot pipes (rubber
// slurry hose)" persisted as DN 450 steel, inflating one row to 47%
// of the RFQ's weight). An explicit size or hose material in a row's
// own description always beats anything inherited from surrounding
// context, so this guard re-asserts the description after extraction
// regardless of which extractor (AI or deterministic) produced the
// row.
export function enforceExplicitDescriptionSpecs<T extends SizeGuardedItem>(
  item: T,
): SizeGuardResult<T> {
  const corrections: string[] = [];
  const isMm = !item.diameterUnit || item.diameterUnit === "mm";
  const statedBores = isMm ? explicitNominalBoresIn(item.description) : [];
  const firstStatedBore = statedBores[0];
  const diameterContradictsDescription =
    firstStatedBore !== undefined &&
    (item.diameter === null || !statedBores.includes(item.diameter));
  const diameter = diameterContradictsDescription ? firstStatedBore : item.diameter;
  if (diameterContradictsDescription) {
    corrections.push(
      `diameter ${item.diameter ?? "missing"} -> ${firstStatedBore} (description states DN ${firstStatedBore})`,
    );
  }

  const hosePhrase = item.description?.match(HOSE_PHRASE_PATTERN)?.[0];
  const materialContradictsDescription =
    !!hosePhrase && /steel/i.test(item.material || "") && !/hose/i.test(item.material || "");
  const material = materialContradictsDescription ? hosePhrase : item.material;
  if (materialContradictsDescription) {
    corrections.push(`material "${item.material}" -> "${hosePhrase}" (description names a hose)`);
  }

  if (corrections.length === 0) return { item, corrections };
  return { item: { ...item, diameter, material }, corrections };
}
