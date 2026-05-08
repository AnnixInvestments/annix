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
   - itemType (one of: pipe | bend | reducer | tee | flange | expansion_joint | tank_chute | other)
   - quantity (number)
   - diameter (number, mm — nominal bore for pipe-shaped items)
   - wallThickness (number, mm — numeric WT in mm if the drawing gives one)
   - schedule (string or null — pipe schedule / weight designation: "HVY", "STD", "XS", "XXS", "MED", "LGT", "SCH40", "SCH80", "SCH160", "API 5L X-grade" etc. ALWAYS capture this when the drawing shows a designation like "150NB x HVY" — that "HVY" goes here, NOT in description)
   - length (number, mm)
   - flangeConfig (string — verbatim drawing wording, e.g. "P.E.", "F.B.E. F/F", "F/PE")
   - liningType (string or null — internal lining material, e.g. "Linatex Linard 60", or null if none)
   - liningThicknessMm (number or null)
   - coatingSystem (string or null — external paint system code, e.g. "R1", "R2a")
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

Same rules apply for liningType, liningThicknessMm, materialClass and schedule — read the per-item cell, treat blank/dash/N/A as null, never propagate from another mark or a title-block default.`;

export const DRAWING_ITEM_SCHEMA_EXAMPLE = `{
  "items": [
    {
      "itemNumber": "-01",
      "description": "Pipe",
      "itemType": "pipe",
      "quantity": 6,
      "diameter": 1000,
      "wallThickness": 16,
      "schedule": null,
      "length": 6000,
      "flangeConfig": "F.B.E. F/F",
      "liningType": null,
      "liningThicknessMm": null,
      "coatingSystem": "R2a",
      "materialClass": "1000/3",
      "banding": 0,
      "deviations": [],
      "drawingReference": "HH01",
      "revision": "Sheet 1 Of 9"
    },
    {
      "itemNumber": "-06",
      "description": "Pipe",
      "itemType": "pipe",
      "quantity": 1,
      "diameter": 150,
      "wallThickness": null,
      "schedule": "HVY",
      "length": 6000,
      "flangeConfig": "P.E.",
      "liningType": null,
      "liningThicknessMm": null,
      "coatingSystem": null,
      "materialClass": "SABS62",
      "banding": 0,
      "deviations": [],
      "drawingReference": "HH06",
      "revision": "Sheet 6 Of 9"
    }
  ],
  "specifications": { "referencedCodes": ["R1", "R2a", "1000/3", "SABS62"] },
  "metadata": { "project": "...", "customer": "...", "drawingNumber": "...", "revision": "...", "date": "...", "drawnBy": "..." }
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
  parts.push(`Respond ONLY with valid JSON of this exact shape:\n${DRAWING_ITEM_SCHEMA_EXAMPLE}`);
  if (input.closing) parts.push(input.closing.trim());
  return parts.join("\n\n");
}
