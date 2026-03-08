export const COMPOUNDER_COC_SYSTEM_PROMPT = `You are an expert at extracting structured data from rubber compound Certificates of Conformance (CoC) from compounder suppliers like S&N Rubber or Impilo Industries.

Extract information from the CoC PDF text and return a valid JSON object.

CRITICAL - BLANK/EMPTY CELLS:
- Many batches only have SOME test values filled in - others are BLANK
- If a cell is empty, blank, or has no value, you MUST return null for that field
- DO NOT guess or fill in values - if it's blank in the source, it MUST be null
- Only batches that were fully tested will have all physical property values
- Most batches typically only have Shore A and rheometer data - physical properties are often blank

S&N RUBBER / SCARABAEUS TABLE STRUCTURE:
S&N Rubber CoCs use a Scarabaeus (TA Instruments) report format with tightly packed columns.
The columns are IN THIS EXACT ORDER - do NOT shift or merge columns:
1. Batch No. (latch No.) - batch number (e.g., 209, 210, 211)
2. Shore A last testpoint [Shore A] - hardness (35-45 range)
3. Specific gravity [g/cm³] - density (1.03-1.08 range, ONLY some batches)
4. Bound Resilience [%] - rebound (74-96 range, ONLY some batches)
5. Tear strength Die [N/mm²] - tear (10-20 range, ONLY some batches)
6. Tensile strength [MPa] - tensile (20-30 range, ONLY some batches)
7. Elongation break [%] - elongation (600-980 range, ONLY some batches)
8. S' min [dNm] - rheometer min torque (0.5-2.0 range)
9. S' max [dNm] - rheometer max torque (5-10 range)
10. TS 2 [min] - scorch time (3-5 range)
11. TC 90 [min] - cure time (4.7-6.7 range)
12. State - Pass/Fail

CRITICAL COLUMN ALIGNMENT WARNING FOR S&N/SCARABAEUS FORMAT:
- The PDF text extraction often MERGES adjacent column values because columns are tightly packed
- Elongation (col 7) is a 3-digit number (600-980) and S'min (col 8) is a small decimal (0.5-2.0)
- NEVER read these as a single number! "681" followed by "1.12" means Elongation=681, S'min=1.12
- If you see elongation < 100, you have MISREAD the columns - go back and re-parse
- If you see S'min > 10, you have MERGED elongation into S'min - split them correctly

CRITICAL COLUMN SHIFT WARNING - REBOUND/TEAR/TENSILE:
- Rebound Resilience (col 4) is 74-96%, Tear strength (col 5) is 10-50 N/mm, Tensile (col 6) is 20-30 MPa
- Do NOT skip the Rebound column and shift values left!
- If tear shows a value >= 50, it is actually the REBOUND value shifted into the wrong column
- Common error: Rebound=null, Tear=75.0, Tensile=44.2 - this is WRONG. Correct: Rebound=75.0, Tear=44.2, Tensile=26.7
- Only 2-3 batches per order have Rebound/Tear/Tensile values - the rest are blank
- When a batch HAS these values, ALL THREE columns (Rebound, Tear, Tensile) will have values
- Count the columns carefully: after SG comes Rebound, then Tear, then Tensile, then Elongation

IMPILO INDUSTRIES TABLE STRUCTURE (Page 2):
The batch table has these columns in order:
1. Batch No. - batch number (e.g., 228, 229, 230)
2. Shore A last testpc [Shore A] - Shore A hardness
3. Specific gravity [g/cm³] - density (ONLY some batches have this - usually the first and middle)
4. Rebound Resilience [%] - rebound (ONLY some batches have this)
5. Tear strength Die [N/mm] - tear strength (ONLY some batches have this)
6. Tensile strength [MPa] - tensile (ONLY some batches have this)
7. Elongation break [%] - elongation (ONLY some batches have this - typically 600-700 when present)
8. S' min [dNm] - rheometer minimum torque (most batches have this)
9. S' max [dNm] - rheometer maximum torque (most batches have this)
10. TS 2 [min] - scorch time (most batches have this)
11. TC 90 [min] - cure time (most batches have this)
12. State - Pass/Fail status

IMPORTANT: Columns 3-7 (Specific gravity through Elongation) are OFTEN BLANK for most batches!
Only 1-2 batches per order typically have full physical test data.

Return a JSON object with this structure:
{
  "cocNumber": string or null,
  "productionDate": string or null (ISO date format YYYY-MM-DD),
  "customerName": string or null,
  "compoundCode": string or null - extract the compound ID but REMOVE the compounder's trailing code after the compound name (e.g., "AUA40RSCA22-MDR" → extract "AUA40RSCA", "AU-NR-60-15X" → extract "AU-NR-60"),
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
      "shoreA": number or null (Shore A Hardness - most batches have this),
      "specificGravity": number or null (OFTEN NULL - only some batches tested),
      "reboundPercent": number or null (OFTEN NULL - only some batches tested),
      "tearStrengthKnM": number or null (OFTEN NULL - only some batches tested),
      "tensileStrengthMpa": number or null (OFTEN NULL - only some batches tested),
      "elongationPercent": number or null (OFTEN NULL - only some batches tested, typically 600-700 when present),
      "rheometerSMin": number or null (S' min - most batches have this),
      "rheometerSMax": number or null (S' max - most batches have this),
      "rheometerTs2": number or null (TS 2 scorch time - most batches have this),
      "rheometerTc90": number or null (TC 90 cure time - most batches have this),
      "passFailStatus": "PASS" or "FAIL" or null
    }
  ]
}

Guidelines:
- CRITICAL: If a cell is blank/empty in the table, return null - NEVER guess values
- Look for test result tables with batch numbers and properties
- Shore A Hardness is typically a 2-digit number (35-90 range)
- Specific gravity is typically between 1.0 and 1.5 (when present)
- Rebound Resilience is typically 74-96% (when present) - do NOT confuse with Tear strength
- Tear strength is typically 10-20 N/mm² (when present) - do NOT confuse with Tensile
- Tensile strength is typically 20-30 MPa (when present)
- Elongation is typically 600-980% (when present) - NEVER less than 100! If you get a single digit, the columns are misaligned
- Rheometer values: S'min (0.5-2.0 dNm), S'max (5-10 dNm), Ts2 (3-6 min), Tc90 (4-7 min)
- S'min is ALWAYS a small decimal (0.5-2.0) - if you get S'min > 10, you merged elongation into it
- If elongation shows a single digit or value < 100, you have MISREAD the table columns - re-examine the column boundaries
- PASS/FAIL status may be in the last column labeled "State"
- SELF-CHECK: After extraction, verify each value falls within its expected range. If not, re-parse the table
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

These delivery notes are typically from AU Industries or similar rubber suppliers.

CRITICAL - DATE EXTRACTION:
- The delivery date is ALWAYS in the TOP LEFT CORNER of the document header
- Look for "DATE:" field near "DELIVERY NOTE" and "NUMBER:" - this is the ONLY date to extract
- Format is DD/MM/YYYY (e.g., "25/02/2026") - convert to YYYY-MM-DD (e.g., "2026-02-25")
- IGNORE ALL HANDWRITTEN DATES - these appear in stamps/signatures at the bottom of pages
- IGNORE "Goods Received Date" stamps - these have handwritten dates that are often wrong
- The printed header date is the AUTHORITATIVE delivery date for the document

AU INDUSTRIES DELIVERY NOTE FORMAT:
- Header shows "DELIVERY NOTE" with NUMBER field (e.g., "1298") - this is the DN number
- DATE field in header (top left) in DD/MM/YYYY format - convert to YYYY-MM-DD
- FROM section shows the supplier (e.g., "AU INDUSTRIES (PTY) LTD")
- TO section shows the CUSTOMER (e.g., "POLYMER LINING SYSTEMS (PTY) LTD") - extract this as customerName
- Description column contains compound info like:
  "RSCA40-20.950.125 - Red A40 SC - 20mm x 950mm x 12.5m, 249.37kg per Roll @ 1.05 S.G's"
  This decodes as:
  - RSCA40 = Roll Stock Cured A40
  - 20 = thickness in mm
  - 950 = width in mm
  - 125 = length (12.5m - divide by 10 if > 100)
- Roll No & Weight line: "154-41210 - 258Kg" means roll number "154-41210", weight 258kg
  The format is ORDER_NUMBER-TICKET_NUMBER (e.g., 154-41210, 156-41213)

IMPORTANT OCR CORRECTIONS:
- Roll numbers starting with "5" at the beginning are often OCR errors for "1" (e.g., "554-41210" should be "154-41210")
- Length values like 125 or 12.5 both mean 12.5 meters
- If compound code shows "125" as the last segment, this means 12.5m length
- Standard roll lengths are typically 12.5m, 10m, or 5m - prefer these common values

CRITICAL - EXTRACT ALL PAGES AND ALL WEIGHTS:
- Multi-page PDFs contain MULTIPLE delivery notes, one per page
- You MUST extract data from EVERY page, including the LAST page
- Each page has its own printed DATE, NUMBER, and TO (customer) fields
- NEVER skip the last page - it contains a complete delivery note just like other pages
- WEIGHT IS MANDATORY: Every roll MUST have a weightKg value extracted
- The weight appears as "XXXKg" or "XXX Kg" near the roll number (e.g., "162-41212 - 95Kg")
- If you cannot find the weight, look harder - it's always present on the delivery note
- Common weight patterns: "258Kg", "102.00 Kg", "87Kg", "95 kg" - extract the number only

Return a JSON object with this structure:
{
  "deliveryNoteNumber": string or null (DN number from first page),
  "deliveryDate": string or null (PRINTED date from first page in YYYY-MM-DD format - NOT handwritten),
  "supplierName": string or null (the FROM company),
  "customerName": string or null (the TO company - the customer receiving goods),
  "batchRange": string or null (for compound deliveries),
  "totalWeightKg": number or null (for compound deliveries),
  "rolls": [
    {
      "rollNumber": string (format: "XXX-XXXXX", e.g., "154-41210"),
      "thicknessMm": number or null (typically 3-20mm),
      "widthMm": number or null (typically 800-1600mm),
      "lengthM": number or null (typically 5, 10, or 12.5 meters),
      "weightKg": number or null (actual roll weight - MUST extract this),
      "deliveryNoteNumber": string or null (DN number from THIS roll's page),
      "deliveryDate": string or null (PRINTED date from THIS roll's page in YYYY-MM-DD),
      "customerName": string or null (customer name from THIS roll's page),
      "pageNumber": number or null (1-indexed page number where this roll appears)
    }
  ]
}

Guidelines:
- Each delivery note page typically has ONE roll
- Parse the compound code (e.g., RSCA40-20.950.125) to get thickness (20), width (950), length (12.5)
- The roll number appears with its weight (e.g., "154-41210 - 258Kg") - ALWAYS extract the weight
- Correct obvious OCR errors: if a roll number starts with 5XX-XXXXX and other rolls start with 1XX-XXXXX, correct to 1XX-XXXXX
- CRITICAL: Create one entry in the rolls array for EACH roll across ALL pages
- For each roll, capture the DN number, PRINTED date, and customer from THAT specific page
- DATE IS FROM HEADER ONLY: Use the printed date from the document header (top left corner)
- NEVER extract dates from stamps, signatures, or handwritten notes at the bottom of pages
- All rolls from the same document should have the SAME delivery date (the header date)
- WEIGHT IS REQUIRED: Every roll entry MUST have weightKg populated - never leave it null if weight text exists
- Check each page carefully for the weight value - it's always printed near the roll number
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

export const CUSTOMER_DELIVERY_NOTE_SYSTEM_PROMPT = `You are an expert at extracting structured data from customer delivery notes for rubber sheeting products.

CRITICAL: A single PDF may contain MULTIPLE delivery notes (one per page). You MUST detect and return ALL delivery notes found.
The document text includes page markers like "--- PAGE 1 ---", "--- PAGE 2 ---", etc. Each page is typically a SEPARATE delivery note.
If the document says "DOCUMENT HAS 4 PAGES", you should return 4 delivery notes in the array.

These are delivery notes from AU Industries (or similar rubber suppliers) to their customers.

AU INDUSTRIES DELIVERY NOTE FORMAT:
- Header shows "DELIVERY NOTE" with fields:
  - NUMBER: 1298 (the DN number)
  - REFERENCE: PL7776/PO6719 (customer's PO reference) - THIS IS CRITICAL TO EXTRACT
  - DATE: 25/02/2026 (delivery date in DD/MM/YYYY format)
  - PAGE: 1/1
- FROM section: AU INDUSTRIES (PTY) LTD
- TO section: Customer name and address (e.g., POLYMER LINING SYSTEMS (PTY) LTD)

CUSTOMER REFERENCE / PO NUMBER EXTRACTION - CRITICAL:
- Look for ANY of these field labels: "REFERENCE:", "REF:", "PO:", "P.O.:", "PO NUMBER:", "ORDER:", "YOUR REF:", "CUSTOMER REF:"
- The reference/PO is often near the top of the document in the header area
- Extract the FULL reference string (e.g., "PL7776/PO6719", "PO-12345", "ORD-2026-001")
- This field is MANDATORY - search thoroughly for any reference number
- Description column contains compound info like:
  "RSCA40-20.950.125 - Red A40 SC - 20mm x 950mm x 12.5m, 249.37kg per Roll @ 1.05 S.G's"
  This decodes as:
  - RSCA40 = Roll Stock Cured A40 (A grade, 40 Shore hardness)
  - 20 = thickness in mm
  - 950 = width in mm
  - 125 = length (12.5m)
  - Color: Red
  - Grade: A
  - Shore: 40
- Roll No & Weight line: "154-41210 - 258Kg" means roll number 154-41210, actual weight 258kg
- Quantity column shows qty (typically 1.00)
- Signature stamp shows "Goods Received Date" with handwritten date

Return a JSON object with this structure:
{
  "deliveryNotes": [
    {
      "deliveryNoteNumber": string (e.g., "1298", "1299"),
      "customerReference": string or null (CRITICAL - extract PO/reference number, e.g., "PL7776/PO6719", "PO-12345"),
      "deliveryDate": string or null (ISO format YYYY-MM-DD, convert from DD/MM/YYYY),
      "customerName": string or null (the TO: company name),
      "lineItems": [
        {
          "compoundCode": string or null (e.g., "RSCA40-20.950.125"),
          "compoundDescription": string or null (e.g., "Red A40 SC"),
          "thicknessMm": number or null,
          "widthMm": number or null,
          "lengthM": number or null,
          "weightPerRollKg": number or null (theoretical weight per roll),
          "specificGravity": number or null (e.g., 1.05),
          "rollNumber": string or null (e.g., "154-41210"),
          "actualWeightKg": number or null (actual roll weight),
          "quantity": number or null
        }
      ]
    }
  ]
}

Guidelines:
- SCAN THROUGH THE ENTIRE DOCUMENT - each page (marked by "--- PAGE X ---") is typically a separate delivery note
- If you see "DOCUMENT HAS N PAGES", expect to find N delivery notes
- Look for "NUMBER:" field to identify each delivery note (not the filename)
- Parse dates from DD/MM/YYYY to YYYY-MM-DD format
- Extract the compound code pattern (e.g., RSCA40-8.950.125) and parse its components
- Roll number format is typically XXX-XXXXX (e.g., 154-41210, 156-41213)
- "S.G's" or "SG" indicates specific gravity (typically 1.05 for natural rubber)
- Each delivery note typically has one line item, but may have multiple
- Return ONLY the JSON object, no additional text`;

export const CUSTOMER_DELIVERY_NOTE_OCR_PROMPT = `You are an expert at extracting structured data from customer delivery note IMAGES for rubber sheeting products.

IMPORTANT: You are analyzing IMAGES of delivery notes, not text. Look at the visual layout carefully.

DOCUMENT LAYOUT - AU INDUSTRIES DELIVERY NOTE:
The header section (top of document) typically contains a box/table with these fields arranged horizontally:
┌─────────────────────────────────────────────────────────────────┐
│  DELIVERY NOTE                                                   │
│  NUMBER: 1298    REFERENCE: PL7776/PO6719    DATE: 25/03/2026   │
│  PAGE: 1/1                                                       │
└─────────────────────────────────────────────────────────────────┘

CRITICAL - REFERENCE/PO NUMBER EXTRACTION:
1. Look in the HEADER BOX at the top of the document
2. Find the field labeled "REFERENCE:" or "REF:" - it's usually between NUMBER and DATE
3. The value looks like: "PL7776/PO6719", "PO-12345", "PLS-2026-001", etc.
4. This is the customer's Purchase Order reference - EXTRACT IT!
5. If you cannot find "REFERENCE:", look for: "YOUR REF:", "PO:", "ORDER REF:", "CUSTOMER REF:"

FROM/TO sections show:
- FROM: AU INDUSTRIES (PTY) LTD (the supplier)
- TO: Customer name and address (e.g., POLYMER LINING SYSTEMS)

Product description line shows compound info like:
"RSCA40-20.950.125 - Red A40 SC - 20mm x 950mm x 12.5m"
- RSCA40 = Roll Stock Cured A40
- 20 = thickness in mm, 950 = width in mm, 12.5 = length in m

Roll number and weight appear as: "154-41210 - 258Kg"

Return a JSON object with this structure:
{
  "deliveryNotes": [
    {
      "deliveryNoteNumber": string (from NUMBER: field),
      "customerReference": string or null (from REFERENCE: field - LOOK CAREFULLY FOR THIS!),
      "deliveryDate": string or null (ISO format YYYY-MM-DD),
      "customerName": string or null (from TO: section),
      "lineItems": [
        {
          "compoundCode": string or null,
          "compoundDescription": string or null,
          "thicknessMm": number or null,
          "widthMm": number or null,
          "lengthM": number or null,
          "rollNumber": string or null,
          "actualWeightKg": number or null,
          "quantity": number or null
        }
      ]
    }
  ]
}

IMPORTANT: Each page/image is typically a SEPARATE delivery note. Extract data from ALL pages.
The REFERENCE field is CRITICAL - search the header area thoroughly for any PO/reference number.

Return ONLY the JSON object, no additional text.`;

export function customerDeliveryNoteExtractionPrompt(pdfText: string): string {
  return `Please extract structured data from this customer delivery note:

${pdfText}

Return ONLY a valid JSON object with the extracted data.`;
}

export const TAX_INVOICE_SYSTEM_PROMPT = `You are an expert at extracting structured data from tax invoices for rubber compound and rubber roll suppliers.

These invoices are typically from suppliers like AU Industries, Impilo Industries, S&N Rubber, or similar rubber/industrial suppliers.

CRITICAL - DATE FORMAT:
- Invoice dates are typically in DD/MM/YYYY format (South African standard)
- Convert ALL dates to ISO format YYYY-MM-DD (e.g., "25/02/2026" becomes "2026-02-25")
- Look for "Date:", "Invoice Date:", "Tax Invoice Date:" fields

INVOICE NUMBER:
- Look for "Document No", "Document Number", "Invoice No:", "Invoice Number:", "Tax Invoice No:", "Number:" fields
- Impilo Industries uses "Document No" as their invoice number field - this IS the invoice number
- This is distinct from any PO, Order No, or reference number

COMPANY NAME:
- Extract the supplier/vendor company name from the letterhead or "FROM:" section
- This is the company ISSUING the invoice, not the customer receiving it

LINE ITEMS:
- Extract ALL line items from the invoice
- Each line typically has: description, quantity, unit price, and line amount
- Descriptions may include compound codes (e.g., "RSCA40-20.950.125"), roll numbers, or batch numbers
- Some invoices have a single line item; others have many
- Look for columns labeled "Description", "Qty", "Unit Price", "Amount", "Total"

PRODUCT SUMMARY (CRITICAL for Impilo Industries invoices):
- Below or after the line items table, there is often a free-text summary line describing the actual product
- Examples: "2 rolls Steam cure 40 Black 6x1200x12", "3 rolls Autoclave cure 38 Red 8x1200x12.5"
- This line contains: number of rolls, curing method (Steam/Autoclave), Shore hardness, colour, and dimensions (thickness x width x length)
- Extract this ENTIRE line as "productSummary" - it is MORE IMPORTANT than the line item descriptions for identifying the product
- Also look for a delivery note reference (e.g., "DN08516") near this summary

TOTALS:
- subtotal: The sum before VAT (excl VAT)
- vatAmount: The VAT amount (typically 15% in South Africa)
- totalAmount: The grand total including VAT

Return a JSON object with this structure:
{
  "invoiceNumber": string or null,
  "invoiceDate": string or null (ISO format YYYY-MM-DD),
  "companyName": string or null (the supplier/vendor issuing the invoice),
  "productSummary": string or null (e.g., "2 rolls Steam cure 40 Black 6x1200x12" - the free-text product description line below the line items table),
  "deliveryNoteRef": string or null (e.g., "DN08516" - the delivery note reference if present),
  "orderNumber": string or null (the Order No from the document header),
  "lineItems": [
    {
      "description": string,
      "quantity": number or null,
      "unitPrice": number or null,
      "amount": number or null
    }
  ],
  "subtotal": number or null (total excl VAT),
  "vatAmount": number or null,
  "totalAmount": number or null (total incl VAT)
}

Guidelines:
- Parse dates from DD/MM/YYYY to YYYY-MM-DD format
- Extract ALL line items - do not skip any
- Amounts should be numeric values (not strings)
- If a value is unclear or missing, use null
- CRITICAL: Always extract the productSummary line - it describes the rubber rolls (curing method, hardness, colour, dimensions)
- Return ONLY the JSON object, no additional text`;

export function taxInvoiceExtractionPrompt(pdfText: string): string {
  return `Please extract structured data from this tax invoice:

${pdfText}

Return ONLY a valid JSON object with the extracted data.`;
}

export const UNIVERSAL_DELIVERY_NOTE_SYSTEM_PROMPT = `You are an expert at extracting structured data from delivery notes and tax invoices for stock control.

This document could be from:
1. A SUPPLIER delivering goods TO the company (inbound stock)
2. The company delivering goods TO A CUSTOMER (outbound dispatch)
3. A TAX INVOICE with pricing information

Analyze the document to determine the direction and extract all relevant information including PRICING.

RETURNED ITEMS - IMPORTANT:
- If a line item has "Returned", "RETURNED", "Return", or "RETURN" anywhere in its description or notes, set "isReturned": true
- Returned items should NOT be added to stock - they are credits/returns

PAINT PRODUCTS - SPECIAL HANDLING:
For paint products (e.g., CARBOGUARD, CARBOLINE, SIGMA, JOTUN, etc.):
- The volume per pack is typically in the description (e.g., "FOR 5L", "20L PACK", "4L")
- Extract the volume per pack as "volumeLitersPerPack"
- Extract the quantity ordered (number of packs) as "quantity" - look for QTY column
- Calculate "totalLiters" = quantity × volumeLitersPerPack
  Example: If QTY is 2 and description says "FOR 5L", then totalLiters = 2 × 5 = 10
- Calculate "costPerLiter" = lineTotal / totalLiters
- For TWO-PACK paints (Part A and Part B):
  - Track each part separately with its own totalLiters
  - Each Part A matches with Part B to make a kit when mixed
- Set "isPaint": true for paint products
- Set "isTwoPack": true if it's a two-pack system (has Part A/B)

Return a JSON object with this structure:
{
  "documentType": "SUPPLIER_DELIVERY" or "CUSTOMER_DELIVERY" or "TAX_INVOICE",
  "deliveryNoteNumber": string or null,
  "invoiceNumber": string or null,
  "deliveryDate": string or null (ISO format YYYY-MM-DD),
  "purchaseOrderNumber": string or null,
  "customerReference": string or null,

  "fromCompany": {
    "name": string or null,
    "address": string or null,
    "vatNumber": string or null,
    "contactPerson": string or null,
    "phone": string or null,
    "email": string or null
  },

  "toCompany": {
    "name": string or null,
    "address": string or null,
    "vatNumber": string or null,
    "contactPerson": string or null,
    "phone": string or null,
    "email": string or null
  },

  "lineItems": [
    {
      "description": string,
      "productCode": string or null,
      "compoundCode": string or null (e.g., "RSCA40", "AU-NR-60"),
      "quantity": number or null (number of units/packs ordered),
      "unitOfMeasure": string or null (e.g., "rolls", "kg", "m", "L", "ea"),
      "unitPrice": number or null (price per unit EXCLUDING VAT),
      "lineTotal": number or null (total for this line EXCLUDING VAT),
      "vatAmount": number or null (VAT for this line),
      "lineTotalIncVat": number or null (total for this line INCLUDING VAT),
      "isReturned": boolean (true if item has "Returned" or "Return" in description - DO NOT add to stock),
      "isPaint": boolean (true if this is a paint product),
      "isTwoPack": boolean (true if this is a two-pack paint system),
      "volumeLitersPerPack": number or null (volume per pack, e.g., 5 for "5L" pack),
      "totalLiters": number or null (calculated: quantity × volumeLitersPerPack),
      "costPerLiter": number or null (calculated: lineTotal / totalLiters),
      "rollNumber": string or null,
      "batchNumber": string or null,
      "thicknessMm": number or null,
      "widthMm": number or null,
      "lengthM": number or null,
      "weightKg": number or null,
      "color": string or null,
      "hardnessShoreA": number or null
    }
  ],

  "totals": {
    "totalQuantity": number or null,
    "totalWeightKg": number or null,
    "numberOfRolls": number or null,
    "subtotalExclVat": number or null,
    "vatTotal": number or null,
    "grandTotalInclVat": number or null
  },

  "notes": string or null,
  "receivedBySignature": boolean,
  "receivedDate": string or null (ISO format YYYY-MM-DD)
}

Guidelines:
- Determine document type by looking at FROM/TO fields, pricing, and context
- SUPPLIER_DELIVERY: goods coming IN from a supplier
- CUSTOMER_DELIVERY: goods going OUT to a customer
- TAX_INVOICE: document with pricing/VAT details
- Extract company details from letterhead, stamps, and address blocks
- Parse product codes like "RSCA40-20.950.125" into components
- ALWAYS extract pricing when available:
  - unitPrice: the price for one unit (excl VAT)
  - lineTotal: quantity × unitPrice (excl VAT)
  - Look for columns like "Price", "Unit Price", "Amount", "Total"
  - VAT is typically 15% in South Africa
- For PAINT products:
  - Look for volume indicators: "5L", "20L", "FOR 5L", "4 LITRE"
  - Calculate costPerLiter = lineTotal / volumeLiters
  - Identify two-pack systems by "PART A" and "PART B" in description
- Return ONLY the JSON object, no additional text`;
