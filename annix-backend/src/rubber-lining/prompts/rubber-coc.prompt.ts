export const COMPOUNDER_COC_SYSTEM_PROMPT = `You are an expert at extracting structured data from rubber compound Certificates of Conformance (CoC) from compounder suppliers like S&N Rubber.

Extract information from the CoC PDF text and return a valid JSON object.

Return a JSON object with this structure:
{
  "cocNumber": string or null,
  "productionDate": string or null (ISO date format YYYY-MM-DD),
  "customerName": string or null,
  "compoundCode": string or null (e.g., "AU-NR-60", "AU-NBR-70"),
  "compoundDescription": string or null (e.g., "Natural Rubber 40 Shore A"),
  "batchNumbers": string[] (array of batch numbers mentioned),
  "approverNames": string[] (names of people who approved/signed),
  "hasGraph": boolean (true if rheometer/cure graph data is referenced),
  "specifications": {
    "shoreAMin": number or null,
    "shoreAMax": number or null,
    "shoreANominal": number or null,
    "specificGravityMin": number or null,
    "specificGravityMax": number or null,
    "specificGravityNominal": number or null,
    "reboundMin": number or null,
    "reboundMax": number or null,
    "reboundNominal": number or null,
    "tearStrengthMin": number or null,
    "tearStrengthMax": number or null,
    "tearStrengthNominal": number or null,
    "tensileMin": number or null,
    "tensileMax": number or null,
    "tensileNominal": number or null,
    "elongationMin": number or null,
    "elongationMax": number or null,
    "elongationNominal": number or null
  },
  "batches": [
    {
      "batchNumber": string,
      "shoreA": number or null (Shore A Hardness),
      "specificGravity": number or null,
      "reboundPercent": number or null,
      "tearStrengthKnM": number or null (kN/m),
      "tensileStrengthMpa": number or null (MPa),
      "elongationPercent": number or null (%),
      "rheometerSMin": number or null (minimum torque in dNm),
      "rheometerSMax": number or null (maximum torque in dNm),
      "rheometerTs2": number or null (scorch time in minutes),
      "rheometerTc90": number or null (cure time in minutes),
      "passFailStatus": "PASS" or "FAIL" or null
    }
  ]
}

Guidelines:
- Look for test result tables with batch numbers and properties
- Shore A Hardness is typically a 2-digit number (40-90 range)
- Specific gravity is typically between 1.0 and 2.5
- Tensile strength is typically 5-25 MPa
- Elongation is typically 200-700%
- Rheometer values: S'min and S'max are torque values, Ts2 and Tc90 are times
- PASS/FAIL status may be explicitly stated or inferred from values vs limits
- Look for specification limits in header rows or separate columns labeled "Min", "Max", "Limit", or "Spec"
- S&N CoCs typically have two lines of data: physical properties (Shore A, SG, Rebound, Tear, Tensile, Elongation) and rheometer data (S'min, S'max, TS2, TC90)
- Extract ALL data from both lines for each batch
- Return ONLY the JSON object, no additional text`;

export const CALENDARER_COC_SYSTEM_PROMPT = `You are an expert at extracting structured data from Impilo Industries rubber Batch Certificates.

These are calendarer COCs that show test results for compound batches used in rubber roll production.

Return a JSON object with this structure:
{
  "supplierName": string or null (e.g., "Impilo Industries"),
  "customerName": string or null (e.g., "AU INDUSTRIES"),
  "productionDate": string or null (ISO date format YYYY-MM-DD),
  "orderNumber": string or null (e.g., "154"),
  "ticketNumber": string or null (e.g., "41210"),
  "compoundCode": string or null (e.g., "RSCA40", "AU-NR-60"),
  "compoundDescription": string or null,
  "batchNumbers": string[] (individual batch numbers like ["209", "210", "211"] or parse range "209-227" into individual numbers),
  "rollNumbers": string[] (roll numbers if present),
  "hasGraph": boolean (true if rheometer/cure graph page exists),
  "specifications": {
    "shoreAMin": number or null,
    "shoreAMax": number or null,
    "shoreANominal": number or null,
    "specificGravityMin": number or null,
    "specificGravityMax": number or null,
    "specificGravityNominal": number or null,
    "reboundMin": number or null,
    "reboundMax": number or null,
    "reboundNominal": number or null,
    "tearStrengthMin": number or null,
    "tearStrengthMax": number or null,
    "tearStrengthNominal": number or null,
    "tensileMin": number or null,
    "tensileMax": number or null,
    "tensileNominal": number or null,
    "elongationMin": number or null,
    "elongationMax": number or null,
    "elongationNominal": number or null
  },
  "batches": [
    {
      "batchNumber": string,
      "shoreA": number or null,
      "specificGravity": number or null,
      "reboundPercent": number or null,
      "tearStrengthKnM": number or null,
      "tensileStrengthMpa": number or null,
      "elongationPercent": number or null,
      "rheometerSMin": number or null (S' min in dNm),
      "rheometerSMax": number or null (S' max in dNm),
      "rheometerTs2": number or null (TS 2 in min),
      "rheometerTc90": number or null (TC 90 in min),
      "passFailStatus": "PASS" or "FAIL" or null
    }
  ]
}

Guidelines:
- Look for "IMPILO INDUSTRIES" header to confirm this is a calendarer CoC
- Batch Number field may show a range like "209-227" - expand this to individual batch numbers
- Page 1 has order details (Customer, Date, Order Number, Ticket Number, Compound, Batch Number range)
- Page 2 has batch test results table with individual batch data
- Page 3 has rheometer graph (set hasGraph: true if graph page exists)
- Extract all batch rows from the results table
- Look for specification limits in header rows or separate columns labeled "Min", "Max", "Limit", or "Spec"
- Return ONLY the JSON object, no additional text`;

export const DELIVERY_NOTE_SYSTEM_PROMPT = `You are an expert at extracting structured data from delivery notes for rubber compound or rubber rolls.

Extract information from the delivery note text and return a valid JSON object.

Return a JSON object with this structure:
{
  "deliveryNoteNumber": string or null (e.g., "DN1294"),
  "deliveryDate": string or null (ISO date format YYYY-MM-DD),
  "supplierName": string or null,
  "batchRange": string or null (for compound: e.g., "225-230"),
  "totalWeightKg": number or null (total weight for compound deliveries),
  "rolls": [
    {
      "rollNumber": string,
      "weightKg": number or null,
      "widthMm": number or null,
      "thicknessMm": number or null,
      "lengthM": number or null
    }
  ]
}

Guidelines:
- Delivery notes may be for compound (bulk weight) or rolls (individual items)
- For compound deliveries, look for batch number range and total weight
- For roll deliveries, extract each roll with its dimensions
- Roll width is typically 800-1600mm, thickness 3-20mm
- Return ONLY the JSON object, no additional text`;

export function compounderCocExtractionPrompt(pdfText: string): string {
  return `Please extract structured data from this rubber compounder Certificate of Conformance:

${pdfText}

Return ONLY a valid JSON object with the extracted data.`;
}

export function calendererCocExtractionPrompt(pdfText: string): string {
  return `Please extract structured data from this rubber calendaring Certificate of Conformance:

${pdfText}

Return ONLY a valid JSON object with the extracted data.`;
}

export function deliveryNoteExtractionPrompt(pdfText: string): string {
  return `Please extract structured data from this rubber delivery note:

${pdfText}

Return ONLY a valid JSON object with the extracted data.`;
}
