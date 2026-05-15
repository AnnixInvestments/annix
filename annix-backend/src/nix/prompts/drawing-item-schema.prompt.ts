/**
 * Canonical Nix drawing-extraction schema rules — shared across every app
 * that extracts line items from a workshop / fabrication / spool drawing.
 *
 * Today's consumers: ASCA quote drafts (Stock Control), and (planned) RFQ
 * BOQ ingestion, Comply-SA spec audits. Each app's profile handler composes
 * its app-specific intro / cross-linking block AROUND this shared schema —
 * so the field names, type rules, blank-cell rules and worked example stay
 * consistent across the platform.
 *
 * Adding a new field:
 * 1. Edit DRAWING_ITEM_SCHEMA_FIELDS below.
 * 2. Edit the worked example in DRAWING_ITEM_SCHEMA_EXAMPLE so Gemini
 *    sees the new field rendered with a real value.
 * 3. Update the frontend ItemRow / DetailsBlock if the new field needs
 *    a column.
 *
 * Per CLAUDE.md §"Nix UI is shared": app-specific copies of these constants
 * are forbidden — the pre-push hook rejects new files in app folders that
 * redefine drawing schema strings.
 */

export const DRAWING_ITEM_SCHEMA_RULES = `CRITICAL — schema rules (must follow exactly):
1. Each item MUST be a FLAT object — no nested 'dimensions' / 'paint' / 'lining' sub-objects. Every property is at the top level of the item.
2. Use these EXACT field names (camelCase, no aliases, no variants):
   - itemNumber (string, e.g. "-01", "HH01", "P1") — the mark / spool / item number
   - description (string, REQUIRED, what the item is, e.g. "Pipe", "90° Bend", "Reducer", "Tank chute")
   - itemType (one of: pipe | bend | reducer | tee | manifold | flange | expansion_joint | tank_chute | other)
   - quantity (number)
   - diameter (number, mm — nominal bore for pipe-shaped items)
   - wallThickness (number, mm — numeric WT in mm if the drawing gives one)
   - schedule (string or null — pipe schedule / weight designation: "HVY", "STD", "XS", "XXS", "MED", "LGT", "SCH40", "SCH80", "SCH160", "API 5L X-grade" etc. ALWAYS capture this when the drawing shows a designation like "150NB x HVY" — that "HVY" goes here, NOT in description)
   - length (number, mm — see "Length / overall-dimension rules" below — this is the OVERALL face-to-face / end-to-end measurement, including welded flanges, NOT a body-only or face-to-shoulder length)
   - flangeConfig (string — verbatim drawing wording, e.g. "P.E.", "F.B.E. F/F", "F/PE")
   - liningType (string or null — internal lining material, e.g. "Linatex Linard 60", or null if none)
   - liningThicknessMm (number or null — rubber lining thickness on the pipe BORE / internal cylindrical surface. When the drawing shows a single blanket value like "Lining: 6mm", that's the bore thickness. Drawings often abbreviate this as the unqualified "lining thickness".)
   - liningFlangeFaceThicknessMm (number or null — rubber lining thickness on the FLANGE FACE specifically, when the drawing calls it out separately from the bore. Common drawing wording: "6mm rubber on flange face", "Flange face: 6mm", or a two-value callout like "Bore 6mm / Flange 3mm". Leave null if the drawing only states one lining thickness — the consumer treats null as "same as liningThicknessMm".)
   - coatingSystem (string or null — coating-system code, e.g. "R1", "R2a")
   - internalCoatingDescription (string or null — verbatim drawing text for the CORROSION INT. / INTERNAL PAINT / INTERNAL COAT callout in the title block, e.g. "BLAST SA 2½ THEN COAT PLASITE 4550-S @ 600μm-800μm", "6mmR/L LINATEX LINARD®60 & 6mm ON FACE", "UNLINED", "NONE". Capture the FULL text Gemini sees, including product names, microns, blast-prep. Use null when the drawing does NOT print a CORROSION INT line — DO NOT invent one from the spec code.)
   - externalCoatingDescription (string or null — verbatim drawing text for the CORROSION EXT. / EXTERNAL PAINT / EXTERNAL COAT callout, e.g. "BLAST SA 2½ THEN COAT PLASITE 4550-S @ 600μm-800μm", "BRILLIANT GREEN", "NONE". Same null-vs-text rule as internalCoatingDescription.)
   - bandingDetails (string or null — verbatim text of any per-pipe identification band callouts the drawing prints, e.g. "Band 1 GOLDEN YELLOW B49, Band 2 MIDDLE BROWN B07" or "3 × Yellow B49 bands at 1m centres". Use null when the drawing only shows a generic band marker with no colour / code / count text.)
   - materialClass (string or null — material class / spec code, e.g. "SC1", "1000/3", "SABS62", "SANS 719", "ASTM A53", "API 5L". ALWAYS capture per-item material specs separately from coating — many drawings have a spec column showing BOTH a paint code (R1) AND a material code (SABS62) — coatingSystem gets the paint code, materialClass gets the material code, both are required when shown)
   - banding (number — count of identification bands shown per item)
   - deviations (array of strings — handwritten/red-pen/coloured-pen client deviations from the printed spec; surface SEPARATELY here, do NOT silently merge into the printed values)
   - drawingReference (string)
   - revision (string)
3. EVERY item MUST have description, itemType, and itemNumber populated. Never omit description.
4. Use null (not empty string, not omitted) when a value is genuinely unknown.
5. Do NOT define what the codes mean (R1, R2a, SC1, SABS62 etc.) — just capture them. The spec extraction step resolves the codes.`;

export const DRAWING_ITEM_ASSIGNMENT_RULES = `CRITICAL — coating, lining, class and schedule assignment rules (the model has been getting these wrong — DO NOT repeat the previous mistakes):

The drawing's title block / general-notes block often shows a default coating like "External Paint: R1". DO NOT propagate that default to per-item rows. The per-item BOM table is the authoritative source — read THAT, not the title block.

Per-item rules:
- For each row in the per-item BOM table, look at the SPECIFIC coating / lining / class / schedule CELL for that row.
- If the cell contains an explicit code (R1, R2a, SC1, 1000/3, SABS62, HVY, etc.) — use that code in the matching field.
- If the cell is BLANK, contains "—", "-", "N/A", "NA", "uncoated", "none", "no coating", or equivalent shorthand — set the field to null. DO NOT fall back to a title-block default.
- If the row's flange config is "P.E." (Plain End) and the coating cell is anything other than an explicit code — assume coatingSystem = null. P.E. items are uncoated by convention unless the per-item cell EXPLICITLY shows a coating code.
- Do NOT carry a code from one mark to another. Each mark's cell is read independently.
- A spec / class column showing TWO codes (e.g. "R1 SABS62" or two stacked cells) means BOTH apply — split them: paint code → coatingSystem, material code → materialClass. NEVER concatenate them into one field.

Schedule / weight rules (a common miss):
- If the description column shows a designation like "150NB x HVY" or "200NB x SCH40", the part AFTER the diameter (HVY, SCH40, MED, etc.) is the SCHEDULE — capture it in the 'schedule' field. Do NOT lose it into description.
- If the drawing has a separate WT column with a numeric value like "10" or "16", that goes in wallThickness. A row CAN have BOTH wallThickness (numeric, mm) AND schedule (string, e.g. "STD") — they are different fields.

Blanket-rule exception:
- If a separately-numbered drawing note says something like "All items receive R1 unless otherwise stated" AND a per-item cell is blank, you MAY use the blanket default — but only after confirming there is NO per-item cell that overrides it (an explicit "—" or "uncoated" in the per-item cell ALWAYS wins over the blanket default).
- Mention which note you applied in the deviations field: "Applied note 4 'all items R1 unless stated' to mark -10".

When uncertain, prefer null + deviations note. Example:
{ "itemNumber": "-03", ..., "flangeConfig": "P.E.", "schedule": "HVY", "coatingSystem": null, "liningType": null, "materialClass": "SABS62", "deviations": ["coating cell blank for mark -03 — assumed uncoated as P.E."] }

Same rules apply for liningType, liningThicknessMm, liningFlangeFaceThicknessMm, materialClass and schedule — read the per-item cell, treat blank/dash/N/A as null, never propagate from another mark or a title-block default.

Lining thickness — bore vs flange face:
- A drawing that prints a single "Lining: 6mm" callout is stating the BORE / cylindrical lining thickness only — set liningThicknessMm = 6, leave liningFlangeFaceThicknessMm = null. The downstream consumer treats null flange face as "same as bore".
- A drawing that prints "6mm rubber on flange face" or "Flange face: 6mm" or any explicit "X mm flange" wording is calling out the FLANGE FACE specifically — set liningFlangeFaceThicknessMm = X. This often differs from the bore value, sometimes deliberately (3mm bore + 6mm flange or 6mm bore + 3mm flange) because the gasket-contact surface is hand-laid separately.
- A drawing that prints BOTH ("Bore 6mm / Flange 3mm" or two stacked dimension lines on a flange detail) — set both fields independently.
- The signed drawings always override any spec-document value here. If the spec PDF says one thickness and the drawing says another, the drawing wins.

Corrosion INT / EXT capture — the model has been silently collapsing this:
- Polymer Lining and similar shop drawings print the corrosion / paint spec as TWO explicit lines in the title block: "CORROSION INT." and "CORROSION EXT." (sometimes "INTERNAL PAINT" / "EXTERNAL PAINT" / "INTERNAL COAT" / "EXTERNAL COAT"). The text following each label is the SHOP'S CONTRACTED treatment for that face, often more specific than the coating-code (R1, R2a) would resolve to via the spec PDF.
- For EVERY drawing item, copy the FULL verbatim text after "CORROSION INT." into internalCoatingDescription, and the FULL text after "CORROSION EXT." into externalCoatingDescription. Include product names, prep ("BLAST SA 2½"), microns, colour callouts — everything printed on the line. Do NOT shorten or normalise.
- "NONE", "UNLINED", "UNCOATED", "—", "N/A" — capture verbatim as the description (string), not null. Null is reserved for drawings where the INT or EXT line is absent entirely.
- When the same drawing also shows a coating code (e.g. "R2a" in the SPEC box AND "CORROSION INT.: PLASITE 4550-S @ 600μm-800μm" below), populate BOTH coatingSystem (the code) AND internalCoatingDescription (the explicit text). They are NOT redundant — the drawing's explicit text overrides the spec-PDF's resolution of the code downstream (per the [[signed-drawings-override]] rule).
- A common mistake: the drawing has "CORROSION INT.: PLASITE …" AND "CORROSION EXT.: PLASITE …" (same product both sides) but the spec PDF's R2a clause says "Plasite internal + Corrocoat external" — the drawing's BOTH-SIDES-PLASITE wins. Capture both fields verbatim so the consumer can apply the override.
- The "& 6mm ON FACE" suffix on a LINATEX internal callout means the rubber lining wraps onto the flange face at the stated thickness — still belongs in liningFlangeFaceThicknessMm (numeric), but the FULL "6mmR/L LINATEX LINARD®60 & 6mm ON FACE" text also goes into internalCoatingDescription so the contracted product name + brand is preserved.
- Rubber FOLD-BACK callouts ("100mm R/L FOLD BACK each end", "75mm rubber fold-back onto external face"): these are deviations from the standard flange-face-only lining, where the rubber wraps further onto the external face of the pipe. Capture them in the deviations array verbatim, e.g. "100mm R/L fold-back on each end onto external face". DO NOT bury them inside internalCoatingDescription — fold-back is treated as a separate work scope by the lining shop.`;

export const DRAWING_ITEM_LENGTH_RULES = `CRITICAL — length / overall-dimension rules for fittings (Gemini has been picking the wrong dimension here — read this carefully):

The 'length' field is the OVERALL FACE-TO-FACE / END-TO-END measurement of the fabricated item, including any flanges welded to it. On most workshop drawings this is the largest dimension printed along the long axis of the part.

DO:
- Pipes / spools: total length from end to end, including any flanges and butt-weld end allowances. If the drawing shows e.g. 'L 6000' and the flange config is 'F.B.E. F/F', length = 6000 (the F.B.E. F/F is captured separately in flangeConfig — do not subtract the flange thicknesses from L).
- Reducers (concentric or eccentric): the OVERALL H dimension — face-to-face / flange-face-to-flange-face / weld-end-to-weld-end. Drawings often show MULTIPLE dimensions around a reducer (e.g. body length 356, flange offsets 100 + 112, overall 568) — the 'length' is the OVERALL number (568 in that example), NEVER the body-only number. If you see a 'TOTAL' or end-to-end dimension callout, use that.
- Tees: the RUN length (centreline-to-centreline of the two run ends, or face-to-face if flanged on the run). NOT the branch length. The branch comes from the secondary NB in the description, not from 'length'.
- Manifolds: a main pipe with MORE THAN ONE stub branching off (3, 4, 5+ outlets). Distinct from a tee (one branch only). itemType = "manifold". Capture: main pipe NB in 'diameter', main pipe length (face-to-face) in 'length', and the stub NB(s) in the description. ALWAYS include the stub COUNT in the description, e.g. "350NB × 3 × 150NB Manifold" or "Manifold 350NB main with 3 × 150NB stubs". The area calculator parses "3-way", "3 stubs", or "× 3" out of description to size the developed length correctly. South African / Polymer Lining drawings sometimes mis-label these as "U-TEE" or just "TEE" — count the actual stubs on the drawing; if more than one branch comes off the main, it's a manifold.
- Equal-Y / Wye: the longest face-to-face dimension printed.
- Elbows / bends (90° / 45° / 180° / U-tee): length is the C/F dimension — the centre-to-face number printed on the drawing, i.e. one arm of the elbow measured from the bend centre to the pipe end face. NOT the developed length, NOT the leg-to-leg overall, NOT the centreline arc. If the drawing shows multiple dimensions around a bend (e.g. 405 and 639 on a U-tee, or 705 C/F on a 90° elbow), pick the labelled C/F figure. If only a radius is shown (e.g. 'R 525' or 'CLR 525'), capture that radius as the length AND add a deviation note "radius captured as C/F". If nothing is printed, set length = null and the area calculator will fall back to a 1.5×NB long-radius default.
- Flanges (standalone): length = null. Flanges have no length dimension along the run.

DO NOT:
- Pick a small intermediate dimension (e.g. a flange neck length, a stub-end offset, an arrow-extension number, or a 'C' / 'M' partial dimension) and call it the length. If the same drawing shows two possible 'length' candidates, ALWAYS prefer the larger end-to-end one.
- Mistake a quantity, a scale callout, a sheet number, or a drawing-reference number for a length.
- Subtract flange / weld allowances. The 'length' field is the geometric overall measurement only.

When the drawing has multiple dimensions and it's unclear which is the overall length, capture the LARGER candidate and add a deviations note: "Length 568 — overall face-to-face; drawing also shows body L 356 and flange offsets 100 + 112."`;

export const DRAWING_ITEM_SCHEMA_EXAMPLE = `{
  "items": [
    {
      "itemNumber": "-01",
      "description": "1000NB x 16mm Pipe",
      "itemType": "pipe",
      "quantity": 6,
      "diameter": 1000,
      "wallThickness": 16,
      "schedule": null,
      "length": 6000,
      "flangeConfig": "F.B.E. F/F",
      "liningType": null,
      "liningThicknessMm": null,
      "liningFlangeFaceThicknessMm": null,
      "coatingSystem": "R2a",
      "internalCoatingDescription": "BLAST SA 2½ THEN COAT PLASITE 4550-S @ 600μm-800μm",
      "externalCoatingDescription": "BLAST SA 2½ THEN COAT PLASITE 4550-S @ 600μm-800μm",
      "bandingDetails": null,
      "materialClass": "1000/3",
      "banding": 0,
      "deviations": [],
      "drawingReference": "HH01",
      "revision": "Sheet 1 Of 9"
    },
    {
      "itemNumber": "-02",
      "description": "350NB x 10mm Pipe",
      "itemType": "pipe",
      "quantity": 45,
      "diameter": 350,
      "wallThickness": 10,
      "schedule": null,
      "length": 6000,
      "flangeConfig": "F.B.E. F/F",
      "liningType": "Linatex Linard 60",
      "liningThicknessMm": 6,
      "liningFlangeFaceThicknessMm": 6,
      "coatingSystem": "R1",
      "internalCoatingDescription": "6mmR/L LINATEX LINARD®60 & 6mm ON FACE",
      "externalCoatingDescription": "BLAST & PAINT CARBOGUARD 890 ALUMINIUM & CARBOTHANE 137 HS BRILLIANT GREEN DFT 150 MICRONS",
      "bandingDetails": "Band 1 GOLDEN YELLOW B49, Band 2 MIDDLE BROWN B07",
      "materialClass": "4000/3",
      "banding": 5,
      "deviations": ["Only 5 of 45 pipes to be banded"],
      "drawingReference": "HH02",
      "revision": "Sheet 2 Of 9"
    },
    {
      "itemNumber": "-04",
      "description": "350NB x 10mm Pipe",
      "itemType": "pipe",
      "quantity": 6,
      "diameter": 350,
      "wallThickness": 10,
      "schedule": null,
      "length": 6000,
      "flangeConfig": "P.E.",
      "liningType": "Linatex Linard 60",
      "liningThicknessMm": 6,
      "liningFlangeFaceThicknessMm": null,
      "coatingSystem": "R1",
      "internalCoatingDescription": "6mmR/L LINATEX LINARD®60",
      "externalCoatingDescription": "BLAST & PAINT CARBOGUARD 890 ALUMINIUM & CARBOTHANE 137 HS BRILLIANT GREEN DFT 150 MICRONS",
      "bandingDetails": null,
      "materialClass": "SANS 719 Gr.B",
      "banding": 0,
      "deviations": ["100mm R/L fold-back on each end onto external face"],
      "drawingReference": "HH04",
      "revision": "Sheet 4 Of 9"
    },
    {
      "itemNumber": "-06",
      "description": "150NB x HVY Pipe",
      "itemType": "pipe",
      "quantity": 1,
      "diameter": 150,
      "wallThickness": null,
      "schedule": "HVY",
      "length": 6000,
      "flangeConfig": "P.E.",
      "liningType": null,
      "liningThicknessMm": null,
      "liningFlangeFaceThicknessMm": null,
      "coatingSystem": null,
      "internalCoatingDescription": "NONE",
      "externalCoatingDescription": "NONE",
      "bandingDetails": null,
      "materialClass": "SABS62",
      "banding": 0,
      "deviations": [],
      "drawingReference": "HH06",
      "revision": "Sheet 6 Of 9"
    },
    {
      "itemNumber": "-29",
      "description": "400NB x 350NB Concentric Reducer",
      "itemType": "reducer",
      "quantity": 8,
      "diameter": 400,
      "wallThickness": null,
      "schedule": "SCH.STD",
      "length": 568,
      "flangeConfig": "F.O.E. F/F",
      "liningType": "Linatex Linard 60",
      "liningThicknessMm": 6,
      "liningFlangeFaceThicknessMm": 6,
      "coatingSystem": "R1",
      "internalCoatingDescription": "6mmR/L LINATEX LINARD®60 & 6mm ON FACE",
      "externalCoatingDescription": "BLAST & PAINT CARBOGUARD 890 ALUMINIUM & CARBOTHANE 137 HS BRILLIANT GREEN DFT 150 MICRONS",
      "bandingDetails": null,
      "materialClass": "S355JR/SANS 719",
      "banding": 0,
      "deviations": [],
      "drawingReference": "HH29",
      "revision": "Sheet 1 Of 3"
    }
  ],
  "specifications": { "referencedCodes": ["R1", "R2a", "1000/3", "SABS62"] },
  "metadata": { "project": "...", "customer": "...", "client": "Langer Heinrich Uranium", "operatingCompany": "Paladin Energy", "drawingNumber": "...", "revision": "...", "date": "...", "drawnBy": "..." }
}`;

/**
 * Composes a complete drawing-extraction system prompt from app-specific
 * framing + the shared schema/assignment rules + the worked example. Apps
 * supply only the parts that vary per-app: the role/persona intro, the
 * domain-specific item-type guidance, and any cross-document linking
 * context. Schema and assignment rules stay identical across apps.
 */
export function composeDrawingPrompt(input: {
  /** App-specific persona + scope, e.g. "You are Nix, extracting line items from an ASCA workshop drawing...". */
  intro: string;
  /** Optional domain-specific guidance about item-type breadth. */
  itemTypesGuidance?: string;
  /** Optional closing note (e.g. drawing-level metadata expectations + JSON shape recap). */
  closing?: string;
}): string {
  const parts: string[] = [input.intro.trim()];
  if (input.itemTypesGuidance) parts.push(input.itemTypesGuidance.trim());
  parts.push(DRAWING_ITEM_SCHEMA_RULES);
  parts.push(DRAWING_ITEM_ASSIGNMENT_RULES);
  parts.push(DRAWING_ITEM_LENGTH_RULES);
  parts.push(`Respond ONLY with valid JSON of this exact shape:\n${DRAWING_ITEM_SCHEMA_EXAMPLE}`);
  if (input.closing) parts.push(input.closing.trim());
  return parts.join("\n\n");
}
