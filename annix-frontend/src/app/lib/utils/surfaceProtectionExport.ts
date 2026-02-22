import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

export interface SpQuantitySummary {
  totalInternalAreaM2: number;
  totalExternalAreaM2: number;
  totalAreaM2: number;
  totalPaintLiters: number;
  totalRubberM2: number;
  totalCeramicTiles: number;
  itemCount: number;
  systemDescriptions: string[];
}

export interface SpSpecificationSummary {
  externalCoating: {
    required: boolean;
    coatingType: string | null;
    blastingGrade: string | null;
    primerType: string | null;
    primerMicrons: number;
    intermediateType: string | null;
    intermediateMicrons: number;
    topcoatType: string | null;
    topcoatMicrons: number;
    totalDftMicrons: number;
    topcoatColour: string | null;
  };
  internalLining: {
    required: boolean;
    liningType: string | null;
    rubberType: string | null;
    rubberThickness: string | null;
    rubberHardness: string | null;
    ceramicType: string | null;
    primerType: string | null;
    primerMicrons: number;
  };
  iso12944Category: string | null;
  surfacePrepStandard: string | null;
}

export interface SpSupplierExportData {
  projectName: string;
  customerName: string;
  rfqNumber: string;
  specification: SpSpecificationSummary;
  quantities: SpQuantitySummary;
  items: SpItemForSupplier[];
}

export interface SpItemForSupplier {
  lineNumber: number;
  description: string;
  nominalBoreMm: number;
  lengthM: number;
  quantity: number;
  internalAreaM2: number;
  externalAreaM2: number;
}

const PAINT_COVERAGE = {
  primer: { m2PerLiter: 8, defaultDftMicrons: 75 },
  intermediate: { m2PerLiter: 6, defaultDftMicrons: 150 },
  topcoat: { m2PerLiter: 10, defaultDftMicrons: 50 },
};

const RUBBER_COVERAGE = {
  wastagePercent: 15,
};

const CERAMIC_COVERAGE = {
  tilesPerM2: 400,
  wastagePercent: 10,
};

export function calculateSpQuantitySummary(
  globalSpecs: GlobalSpecs,
  totalInternalAreaM2: number,
  totalExternalAreaM2: number,
  itemCount: number = 0,
): SpQuantitySummary {
  const totalAreaM2 = totalInternalAreaM2 + totalExternalAreaM2;
  const systemDescriptions: string[] = [];

  let totalPaintLiters = 0;
  let totalRubberM2 = 0;
  let totalCeramicTiles = 0;

  if (globalSpecs.externalCoatingConfirmed && globalSpecs.externalCoatingType) {
    const primerDft = globalSpecs.externalPrimerMicrons || PAINT_COVERAGE.primer.defaultDftMicrons;
    const intermediateDft =
      globalSpecs.externalIntermediateMicrons || PAINT_COVERAGE.intermediate.defaultDftMicrons;
    const topcoatDft =
      globalSpecs.externalTopcoatMicrons || PAINT_COVERAGE.topcoat.defaultDftMicrons;

    const primerLiters =
      (totalExternalAreaM2 * primerDft) /
      (PAINT_COVERAGE.primer.m2PerLiter * PAINT_COVERAGE.primer.defaultDftMicrons);
    const intermediateLiters =
      (totalExternalAreaM2 * intermediateDft) /
      (PAINT_COVERAGE.intermediate.m2PerLiter * PAINT_COVERAGE.intermediate.defaultDftMicrons);
    const topcoatLiters =
      (totalExternalAreaM2 * topcoatDft) /
      (PAINT_COVERAGE.topcoat.m2PerLiter * PAINT_COVERAGE.topcoat.defaultDftMicrons);

    totalPaintLiters = primerLiters + intermediateLiters + topcoatLiters;
    const totalDft = primerDft + intermediateDft + topcoatDft;

    systemDescriptions.push(
      `External: ${globalSpecs.externalCoatingType} (${totalDft}um DFT, ${totalExternalAreaM2.toFixed(2)}m2)`,
    );
  }

  if (globalSpecs.internalLiningConfirmed && globalSpecs.internalLiningType) {
    if (globalSpecs.internalRubberType) {
      totalRubberM2 = totalInternalAreaM2 * (1 + RUBBER_COVERAGE.wastagePercent / 100);
      systemDescriptions.push(
        `Internal: ${globalSpecs.internalRubberType} rubber lining (${globalSpecs.internalRubberThickness || "6mm"}, ${totalInternalAreaM2.toFixed(2)}m2)`,
      );
    } else if (globalSpecs.internalCeramicType) {
      totalCeramicTiles = Math.ceil(
        totalInternalAreaM2 *
          CERAMIC_COVERAGE.tilesPerM2 *
          (1 + CERAMIC_COVERAGE.wastagePercent / 100),
      );
      systemDescriptions.push(
        `Internal: ${globalSpecs.internalCeramicType} ceramic tiles (${totalCeramicTiles} tiles, ${totalInternalAreaM2.toFixed(2)}m2)`,
      );
    } else {
      systemDescriptions.push(
        `Internal: ${globalSpecs.internalLiningType} (${totalInternalAreaM2.toFixed(2)}m2)`,
      );
    }
  }

  return {
    totalInternalAreaM2,
    totalExternalAreaM2,
    totalAreaM2,
    totalPaintLiters: Math.ceil(totalPaintLiters * 1.15),
    totalRubberM2: Math.ceil(totalRubberM2 * 10) / 10,
    totalCeramicTiles,
    itemCount,
    systemDescriptions,
  };
}

export function extractSpSpecificationSummary(globalSpecs: GlobalSpecs): SpSpecificationSummary {
  const primerMicrons = globalSpecs.externalPrimerMicrons || 0;
  const intermediateMicrons = globalSpecs.externalIntermediateMicrons || 0;
  const topcoatMicrons = globalSpecs.externalTopcoatMicrons || 0;

  return {
    externalCoating: {
      required: globalSpecs.externalCoatingConfirmed || false,
      coatingType: globalSpecs.externalCoatingType || null,
      blastingGrade: globalSpecs.externalBlastingGrade || null,
      primerType: globalSpecs.externalPrimerType || null,
      primerMicrons,
      intermediateType: globalSpecs.externalIntermediateType || null,
      intermediateMicrons,
      topcoatType: globalSpecs.externalTopcoatType || null,
      topcoatMicrons,
      totalDftMicrons: primerMicrons + intermediateMicrons + topcoatMicrons,
      topcoatColour: globalSpecs.externalTopcoatColour || null,
    },
    internalLining: {
      required: globalSpecs.internalLiningConfirmed || false,
      liningType: globalSpecs.internalLiningType || null,
      rubberType: globalSpecs.internalRubberType || null,
      rubberThickness: globalSpecs.internalRubberThickness || null,
      rubberHardness: globalSpecs.internalRubberHardness || null,
      ceramicType: globalSpecs.internalCeramicType || null,
      primerType: globalSpecs.internalPrimerType || null,
      primerMicrons: globalSpecs.internalPrimerMicrons || 0,
    },
    iso12944Category: globalSpecs.ecpIso12944Category || globalSpecs.iso12944Category || null,
    surfacePrepStandard: globalSpecs.externalBlastingGrade || "Sa 2.5",
  };
}

export function generateCoatingScheduleHtml(
  globalSpecs: GlobalSpecs,
  projectName: string,
  customerName: string,
  quantitySummary: SpQuantitySummary,
): string {
  const spec = extractSpSpecificationSummary(globalSpecs);
  const date = new Date().toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Coating Schedule - ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 11pt; }
    h1 { color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 10px; font-size: 18pt; }
    h2 { color: #374151; margin-top: 25px; font-size: 14pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    h3 { color: #4b5563; margin-top: 18px; font-size: 12pt; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
    th { background-color: #f3f4f6; font-weight: 600; }
    .header-table { border: none; margin-bottom: 25px; }
    .header-table td { border: none; padding: 3px 10px; }
    .header-table .label { font-weight: 600; width: 120px; }
    .total-row { background-color: #dbeafe; font-weight: bold; }
    .section { margin-bottom: 25px; }
    .note { font-size: 10pt; color: #6b7280; margin-top: 15px; padding: 12px; background: #f9fafb; border-radius: 4px; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 9pt; border-top: 1px solid #e5e7eb; padding-top: 15px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Coating Specification Schedule</h1>

  <table class="header-table">
    <tr><td class="label">Project:</td><td>${projectName}</td><td class="label">Date:</td><td>${date}</td></tr>
    <tr><td class="label">Customer:</td><td>${customerName}</td><td class="label">Rev:</td><td>A</td></tr>
  </table>

  ${
    spec.externalCoating.required
      ? `
  <div class="section">
    <h2>External Coating Specification</h2>
    <table>
      <tr>
        <th>Coating System</th>
        <td colspan="3">${spec.externalCoating.coatingType || "Per manufacturer"}</td>
      </tr>
      <tr>
        <th>ISO 12944 Category</th>
        <td>${spec.iso12944Category || "N/A"}</td>
        <th>Surface Preparation</th>
        <td>${spec.surfacePrepStandard} per ISO 8501-1</td>
      </tr>
    </table>

    <h3>Coating Schedule</h3>
    <table>
      <thead>
        <tr>
          <th>Coat</th>
          <th>Product</th>
          <th>DFT (microns)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Primer</td>
          <td>${spec.externalCoating.primerType || "Per TDS"}</td>
          <td>${spec.externalCoating.primerMicrons || 75}</td>
        </tr>
        <tr>
          <td>Intermediate</td>
          <td>${spec.externalCoating.intermediateType || "Per TDS"}</td>
          <td>${spec.externalCoating.intermediateMicrons || 150}</td>
        </tr>
        <tr>
          <td>Topcoat</td>
          <td>${spec.externalCoating.topcoatType || "Per TDS"}</td>
          <td>${spec.externalCoating.topcoatMicrons || 50}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">Total DFT</td>
          <td>${spec.externalCoating.totalDftMicrons} microns</td>
        </tr>
      </tbody>
    </table>
    ${spec.externalCoating.topcoatColour ? `<p><strong>Topcoat Colour:</strong> ${spec.externalCoating.topcoatColour}</p>` : ""}
  </div>
  `
      : `<div class="section"><h2>External Coating</h2><p>Not required for this project</p></div>`
  }

  ${
    spec.internalLining.required
      ? `
  <div class="section">
    <h2>Internal Lining Specification</h2>
    <table>
      <tr>
        <th>Lining Type</th>
        <td colspan="3">${spec.internalLining.liningType || "Per specification"}</td>
      </tr>
      ${spec.internalLining.rubberType ? `<tr><th>Rubber Type</th><td>${spec.internalLining.rubberType}</td><th>Thickness</th><td>${spec.internalLining.rubberThickness || "6mm"}</td></tr>` : ""}
      ${spec.internalLining.ceramicType ? `<tr><th>Ceramic Type</th><td colspan="3">${spec.internalLining.ceramicType}</td></tr>` : ""}
    </table>
  </div>
  `
      : `<div class="section"><h2>Internal Lining</h2><p>Not required for this project</p></div>`
  }

  <div class="section">
    <h2>Quantity Summary</h2>
    <table>
      <tr>
        <th>External Surface Area</th>
        <td>${quantitySummary.totalExternalAreaM2.toFixed(2)} m2</td>
        <th>Internal Surface Area</th>
        <td>${quantitySummary.totalInternalAreaM2.toFixed(2)} m2</td>
      </tr>
      <tr>
        <th>Total Area</th>
        <td>${quantitySummary.totalAreaM2.toFixed(2)} m2</td>
        <th>Paint Required</th>
        <td>${quantitySummary.totalPaintLiters} liters (incl. 15% wastage)</td>
      </tr>
      ${quantitySummary.totalRubberM2 > 0 ? `<tr><th>Rubber Lining</th><td colspan="3">${quantitySummary.totalRubberM2} m2 (incl. 15% wastage)</td></tr>` : ""}
      ${quantitySummary.totalCeramicTiles > 0 ? `<tr><th>Ceramic Tiles</th><td colspan="3">${quantitySummary.totalCeramicTiles} pieces (incl. 10% wastage)</td></tr>` : ""}
    </table>
  </div>

  <div class="note">
    <strong>General Notes:</strong>
    <ul>
      <li>All coatings to be applied in accordance with manufacturer's Technical Data Sheets (TDS)</li>
      <li>Surface preparation to be verified by certified inspector before coating application</li>
      <li>DFT measurements to be recorded as per ISO 2808</li>
      <li>Environmental conditions during application: RH <85%, Steel temp min 3C above dew point</li>
    </ul>
  </div>

  <div class="footer">
    Generated by Annix RFQ System | ${date}
  </div>
</body>
</html>
  `;
}

export function generateInspectionChecklistHtml(
  globalSpecs: GlobalSpecs,
  projectName: string,
  customerName: string,
): string {
  const spec = extractSpSpecificationSummary(globalSpecs);
  const date = new Date().toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Inspection Checklist - ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 11pt; }
    h1 { color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 10px; font-size: 18pt; }
    h2 { color: #374151; margin-top: 25px; font-size: 14pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
    th { background-color: #f3f4f6; font-weight: 600; }
    .header-table { border: none; margin-bottom: 25px; }
    .header-table td { border: none; padding: 3px 10px; }
    .header-table .label { font-weight: 600; width: 120px; }
    .check-col { width: 60px; text-align: center; }
    .init-col { width: 60px; text-align: center; }
    .checkbox { width: 18px; height: 18px; border: 2px solid #374151; display: inline-block; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 9pt; border-top: 1px solid #e5e7eb; padding-top: 15px; }
    .signature-block { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-line { width: 200px; border-top: 1px solid #374151; padding-top: 5px; text-align: center; }
    @media print { body { padding: 20px; } .checkbox { border: 2px solid black; } }
  </style>
</head>
<body>
  <h1>Surface Protection Inspection Checklist</h1>

  <table class="header-table">
    <tr><td class="label">Project:</td><td>${projectName}</td><td class="label">Date:</td><td>${date}</td></tr>
    <tr><td class="label">Customer:</td><td>${customerName}</td><td class="label">Document:</td><td>QC Inspection Checklist</td></tr>
  </table>

  <h2>Pre-Application Inspection</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Requirement</th>
        <th class="check-col">Pass</th>
        <th class="check-col">Fail</th>
        <th class="init-col">Initials</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Material Certificates</td>
        <td>Batch certificates available and verified</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Material Condition</td>
        <td>Within shelf life, properly stored</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Ambient Temperature</td>
        <td>15-35 deg C</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Relative Humidity</td>
        <td>Max 85%</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Dew Point Margin</td>
        <td>Steel temp min 3 deg C above dew point</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
    </tbody>
  </table>

  <h2>Surface Preparation Inspection</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Requirement</th>
        <th class="check-col">Pass</th>
        <th class="check-col">Fail</th>
        <th class="init-col">Initials</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Surface Cleanliness</td>
        <td>${spec.surfacePrepStandard} per ISO 8501-1</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Surface Profile</td>
        <td>40-75 microns</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Dust Level</td>
        <td>ISO 8502-3 Rating 2 or better</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Edge Preparation</td>
        <td>Sharp edges rounded to min 2mm radius</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Weld Preparation</td>
        <td>Welds ground smooth, spatter removed</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
    </tbody>
  </table>

  <h2>Coating Application Inspection</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Requirement</th>
        <th class="check-col">Pass</th>
        <th class="check-col">Fail</th>
        <th class="init-col">Initials</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Mixing Ratio</td>
        <td>Per manufacturer TDS</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Pot Life</td>
        <td>Material used within pot life</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>WFT During Application</td>
        <td>Within specified range</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Stripe Coating</td>
        <td>Edges, welds, and corners coated</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Overcoat Interval</td>
        <td>Within manufacturer window</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
    </tbody>
  </table>

  <h2>Final Inspection</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Requirement</th>
        <th class="check-col">Pass</th>
        <th class="check-col">Fail</th>
        <th class="init-col">Initials</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total DFT</td>
        <td>${spec.externalCoating.totalDftMicrons || "As specified"} microns</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Visual Appearance</td>
        <td>No runs, sags, or defects</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Holiday Detection</td>
        <td>No holidays detected</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Adhesion Test</td>
        <td>Per ISO 4624 or ASTM D3359</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
      <tr>
        <td>Documentation</td>
        <td>All records complete and signed</td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="check-col"><span class="checkbox"></span></td>
        <td class="init-col"></td>
      </tr>
    </tbody>
  </table>

  <div class="signature-block">
    <div>
      <div class="signature-line">Inspector Name / Signature</div>
    </div>
    <div>
      <div class="signature-line">Date</div>
    </div>
    <div>
      <div class="signature-line">Client Representative</div>
    </div>
  </div>

  <div class="footer">
    Generated by Annix RFQ System | ${date}
  </div>
</body>
</html>
  `;
}

export function generateApplicationProcedureHtml(
  globalSpecs: GlobalSpecs,
  projectName: string,
  customerName: string,
): string {
  const spec = extractSpSpecificationSummary(globalSpecs);
  const date = new Date().toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Application Procedure - ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 11pt; }
    h1 { color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 10px; font-size: 18pt; }
    h2 { color: #374151; margin-top: 25px; font-size: 14pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .header-table { border: none; margin-bottom: 25px; }
    .header-table td { border: none; padding: 3px 10px; }
    .header-table .label { font-weight: 600; width: 120px; }
    .procedure-step { margin: 15px 0; padding: 12px; background: #f9fafb; border-left: 4px solid #2563eb; }
    .procedure-step h4 { margin: 0 0 8px 0; color: #1e40af; }
    .procedure-step p { margin: 5px 0; }
    .warning { background: #fef3c7; border-left-color: #d97706; }
    .warning h4 { color: #92400e; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 9pt; border-top: 1px solid #e5e7eb; padding-top: 15px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Application Procedure</h1>

  <table class="header-table">
    <tr><td class="label">Project:</td><td>${projectName}</td><td class="label">Date:</td><td>${date}</td></tr>
    <tr><td class="label">Customer:</td><td>${customerName}</td><td class="label">Document:</td><td>Application Procedure</td></tr>
  </table>

  <h2>1. Pre-Application Requirements</h2>

  <div class="procedure-step">
    <h4>1.1 Material Verification</h4>
    <p>Verify all coating/lining materials match specification requirements</p>
    <p>Check batch numbers, expiry dates, and storage conditions</p>
    <p>Ensure mixing ratios and pot life are understood</p>
  </div>

  <div class="procedure-step">
    <h4>1.2 Environmental Conditions</h4>
    <p>Ambient Temperature: 15-35 deg C</p>
    <p>Relative Humidity: Max 85%</p>
    <p>Steel temperature must be minimum 3 deg C above dew point</p>
    <p>No application during rain, fog, or high wind conditions</p>
  </div>

  <div class="procedure-step warning">
    <h4>1.3 Safety Requirements</h4>
    <p>PPE: Safety glasses, gloves, respirator as per MSDS</p>
    <p>Adequate ventilation required for enclosed spaces</p>
    <p>Fire extinguisher and first aid kit must be available</p>
  </div>

  <h2>2. Surface Preparation</h2>

  <div class="procedure-step">
    <h4>2.1 Blast Cleaning</h4>
    <p>Standard: ${spec.surfacePrepStandard} per ISO 8501-1</p>
    <p>Profile: 40-75 microns (depending on system requirements)</p>
    <p>Inspect for oil, grease, mill scale, rust, and other contaminants</p>
    <p>All sharp edges to be rounded to minimum 2mm radius</p>
  </div>

  <div class="procedure-step">
    <h4>2.2 Dust and Debris Removal</h4>
    <p>Use clean, dry compressed air or vacuum</p>
    <p>Dust rating per ISO 8502-3: Maximum Rating 2</p>
    <p>Apply coating within 4 hours of blast cleaning (or before flash rust)</p>
  </div>

  ${
    spec.externalCoating.required
      ? `
  <h2>3. External Coating Application</h2>

  <div class="procedure-step">
    <h4>3.1 Primer Application</h4>
    <p>Product: ${spec.externalCoating.primerType || "Per TDS specification"}</p>
    <p>Apply first coat within 4 hours of blast cleaning</p>
    <p>Ensure complete coverage including edges and welds</p>
    <p>Target DFT: ${spec.externalCoating.primerMicrons || 75} microns</p>
  </div>

  <div class="procedure-step">
    <h4>3.2 Intermediate Coat</h4>
    <p>Product: ${spec.externalCoating.intermediateType || "Per TDS specification"}</p>
    <p>Apply within overcoating window per TDS</p>
    <p>Allow flash-off before additional coats</p>
    <p>Target DFT: ${spec.externalCoating.intermediateMicrons || 150} microns</p>
  </div>

  <div class="procedure-step">
    <h4>3.3 Topcoat Application</h4>
    <p>Product: ${spec.externalCoating.topcoatType || "Per TDS specification"}</p>
    <p>Final aesthetic and protective coat</p>
    <p>Uniform colour and gloss</p>
    <p>Target DFT: ${spec.externalCoating.topcoatMicrons || 50} microns</p>
    <p>Total System DFT: ${spec.externalCoating.totalDftMicrons} microns</p>
  </div>
  `
      : ""
  }

  ${
    spec.internalLining.required && spec.internalLining.rubberType
      ? `
  <h2>4. Internal Rubber Lining Application</h2>

  <div class="procedure-step">
    <h4>4.1 Substrate Preparation</h4>
    <p>Blast clean to Sa 2.5 minimum</p>
    <p>Apply adhesive system per manufacturer instructions</p>
    <p>Ensure pot life is not exceeded</p>
  </div>

  <div class="procedure-step">
    <h4>4.2 Rubber Application</h4>
    <p>Rubber Grade: ${spec.internalLining.rubberType}</p>
    <p>Thickness: ${spec.internalLining.rubberThickness || "6mm"}</p>
    <p>Apply rubber sheets ensuring no air entrapment</p>
    <p>Roll out all bubbles and ensure full adhesion</p>
  </div>

  <div class="procedure-step">
    <h4>4.3 Vulcanization</h4>
    <p>Autoclave cure where specified</p>
    <p>Temperature and time per rubber grade requirements</p>
    <p>Cool down gradually to prevent thermal shock</p>
  </div>
  `
      : ""
  }

  ${
    spec.internalLining.required && spec.internalLining.ceramicType
      ? `
  <h2>4. Internal Ceramic Lining Application</h2>

  <div class="procedure-step">
    <h4>4.1 Substrate Preparation</h4>
    <p>Blast clean to Sa 2.5 minimum</p>
    <p>Apply primer/adhesion coat if specified</p>
  </div>

  <div class="procedure-step">
    <h4>4.2 Tile Installation</h4>
    <p>Ceramic Type: ${spec.internalLining.ceramicType}</p>
    <p>Apply epoxy adhesive to substrate and tile back</p>
    <p>Position tiles ensuring consistent gap spacing</p>
    <p>Use temporary supports during cure</p>
  </div>

  <div class="procedure-step">
    <h4>4.3 Grouting</h4>
    <p>Allow adhesive to cure per manufacturer TDS</p>
    <p>Apply epoxy grout to all joints</p>
    <p>Ensure complete filling with no voids</p>
    <p>Clean excess grout before cure</p>
  </div>
  `
      : ""
  }

  <h2>5. Post-Application</h2>

  <div class="procedure-step">
    <h4>5.1 Curing</h4>
    <p>Allow minimum cure time per TDS before handling</p>
    <p>Protect from mechanical damage during cure</p>
    <p>Maintain environmental conditions during full cure</p>
  </div>

  <div class="procedure-step">
    <h4>5.2 Final Inspection</h4>
    <p>DFT verification per ISO 2808</p>
    <p>Holiday detection where specified</p>
    <p>Visual inspection for defects, runs, sags</p>
    <p>Documentation and sign-off</p>
  </div>

  <div class="footer">
    Generated by Annix RFQ System | ${date}
  </div>
</body>
</html>
  `;
}

export function generateItpHtml(
  globalSpecs: GlobalSpecs,
  projectName: string,
  customerName: string,
): string {
  const spec = extractSpSpecificationSummary(globalSpecs);
  const date = new Date().toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <title>ITP - ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; max-width: 1000px; margin: 0 auto; font-size: 10pt; }
    h1 { color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 10px; font-size: 16pt; }
    h2 { color: #374151; margin-top: 20px; font-size: 13pt; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9pt; }
    th, td { border: 1px solid #374151; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background-color: #1e40af; color: white; font-weight: 600; }
    .header-table { border: none; margin-bottom: 20px; }
    .header-table td { border: none; padding: 2px 8px; }
    .header-table .label { font-weight: 600; width: 100px; }
    .section-row { background: #dbeafe; font-weight: 600; }
    .legend { margin-top: 20px; font-size: 9pt; }
    .legend td { padding: 4px 8px; }
    .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 8pt; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    @media print {
      body { padding: 15px; font-size: 9pt; }
      table { font-size: 8pt; }
      th { background: #1e40af !important; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>Inspection and Test Plan (ITP)</h1>
  <h2>Surface Protection Application</h2>

  <table class="header-table">
    <tr><td class="label">Project:</td><td>${projectName}</td><td class="label">Date:</td><td>${date}</td></tr>
    <tr><td class="label">Customer:</td><td>${customerName}</td><td class="label">System:</td><td>${spec.externalCoating.coatingType || "Per Specification"}</td></tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Activity / Test Point</th>
        <th style="width: 15%;">Reference Standard</th>
        <th style="width: 20%;">Acceptance Criteria</th>
        <th style="width: 15%;">Method / Equipment</th>
        <th style="width: 10%;">Frequency</th>
        <th style="width: 5.5%;">C</th>
        <th style="width: 5.5%;">H</th>
        <th style="width: 5.5%;">W</th>
        <th style="width: 5.5%;">R</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section-row">
        <td colspan="9">1.0 PRE-APPLICATION</td>
      </tr>
      <tr>
        <td>1.1 Material Receipt</td>
        <td>ISO 12944-5</td>
        <td>Correct materials, valid shelf life</td>
        <td>Visual, Certificate</td>
        <td>Each batch</td>
        <td>H</td>
        <td>H</td>
        <td></td>
        <td>R</td>
      </tr>
      <tr>
        <td>1.2 Environmental Conditions</td>
        <td>ISO 12944-5</td>
        <td>T: 15-35C, RH: <85%, Steel 3C > DP</td>
        <td>Hygrometer, Thermometer</td>
        <td>Continuous</td>
        <td>H</td>
        <td></td>
        <td></td>
        <td>R</td>
      </tr>
      <tr class="section-row">
        <td colspan="9">2.0 SURFACE PREPARATION</td>
      </tr>
      <tr>
        <td>2.1 Surface Cleanliness</td>
        <td>ISO 8501-1</td>
        <td>${spec.surfacePrepStandard}</td>
        <td>Visual Comparator</td>
        <td>100%</td>
        <td>W</td>
        <td>H</td>
        <td>W</td>
        <td>R</td>
      </tr>
      <tr>
        <td>2.2 Surface Profile</td>
        <td>ISO 8503-4</td>
        <td>40-75 microns</td>
        <td>Replica Tape</td>
        <td>Min 3 per item</td>
        <td>H</td>
        <td>H</td>
        <td></td>
        <td>R</td>
      </tr>
      <tr>
        <td>2.3 Dust Assessment</td>
        <td>ISO 8502-3</td>
        <td>Rating 2 or better</td>
        <td>Tape test</td>
        <td>100%</td>
        <td>H</td>
        <td></td>
        <td></td>
        <td>R</td>
      </tr>
      <tr class="section-row">
        <td colspan="9">3.0 COATING APPLICATION</td>
      </tr>
      <tr>
        <td>3.1 Primer DFT</td>
        <td>ISO 2808</td>
        <td>${spec.externalCoating.primerMicrons || 75}um</td>
        <td>DFT Gauge</td>
        <td>Min 5 per m2</td>
        <td>H</td>
        <td>H</td>
        <td></td>
        <td>R</td>
      </tr>
      <tr>
        <td>3.2 Intermediate DFT</td>
        <td>ISO 2808</td>
        <td>${spec.externalCoating.intermediateMicrons || 150}um</td>
        <td>DFT Gauge</td>
        <td>Min 5 per m2</td>
        <td>H</td>
        <td>H</td>
        <td></td>
        <td>R</td>
      </tr>
      <tr>
        <td>3.3 Topcoat DFT</td>
        <td>ISO 2808</td>
        <td>${spec.externalCoating.topcoatMicrons || 50}um</td>
        <td>DFT Gauge</td>
        <td>Min 5 per m2</td>
        <td>H</td>
        <td>H</td>
        <td></td>
        <td>R</td>
      </tr>
      <tr class="section-row">
        <td colspan="9">4.0 FINAL INSPECTION</td>
      </tr>
      <tr>
        <td>4.1 Total DFT</td>
        <td>ISO 2808</td>
        <td>${spec.externalCoating.totalDftMicrons}um</td>
        <td>DFT Gauge</td>
        <td>Per ISO 19840</td>
        <td>W</td>
        <td>H</td>
        <td>W</td>
        <td>R</td>
      </tr>
      <tr>
        <td>4.2 Visual Inspection</td>
        <td>ISO 12944-5</td>
        <td>No runs, sags, holidays</td>
        <td>Visual</td>
        <td>100%</td>
        <td>W</td>
        <td>H</td>
        <td>W</td>
        <td>R</td>
      </tr>
      <tr>
        <td>4.3 Holiday Detection</td>
        <td>NACE SP0188</td>
        <td>No holidays</td>
        <td>Holiday detector</td>
        <td>100%</td>
        <td>W</td>
        <td>H</td>
        <td>W</td>
        <td>R</td>
      </tr>
      <tr>
        <td>4.4 Adhesion Test</td>
        <td>ISO 4624/ASTM D3359</td>
        <td>Rating 4 or better</td>
        <td>Cross-cut/Pull-off</td>
        <td>Per batch</td>
        <td>W</td>
        <td>H</td>
        <td></td>
        <td>R</td>
      </tr>
    </tbody>
  </table>

  <table class="legend">
    <tr>
      <th colspan="2">Legend</th>
    </tr>
    <tr>
      <td><strong>C</strong> - Contractor</td>
      <td><strong>H</strong> - Hold Point (mandatory witness)</td>
    </tr>
    <tr>
      <td><strong>W</strong> - Witness Point (24hr notice)</td>
      <td><strong>R</strong> - Review Point (records review)</td>
    </tr>
  </table>

  <div class="footer">
    Generated by Annix RFQ System | ${date}
  </div>
</body>
</html>
  `;
}

export function printDocument(html: string): void {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}

export function exportCoatingSupplierData(
  globalSpecs: GlobalSpecs,
  projectName: string,
  customerName: string,
  quantitySummary: SpQuantitySummary,
): string {
  const spec = extractSpSpecificationSummary(globalSpecs);

  const data = {
    projectName,
    customerName,
    specification: spec.externalCoating,
    iso12944Category: spec.iso12944Category,
    surfacePrepStandard: spec.surfacePrepStandard,
    quantities: {
      externalAreaM2: quantitySummary.totalExternalAreaM2,
      paintLiters: quantitySummary.totalPaintLiters,
    },
  };

  return JSON.stringify(data, null, 2);
}

export function exportRubberLiningSupplierData(
  globalSpecs: GlobalSpecs,
  projectName: string,
  customerName: string,
  quantitySummary: SpQuantitySummary,
): string {
  const spec = extractSpSpecificationSummary(globalSpecs);

  const data = {
    projectName,
    customerName,
    specification: spec.internalLining,
    quantities: {
      internalAreaM2: quantitySummary.totalInternalAreaM2,
      rubberM2: quantitySummary.totalRubberM2,
    },
  };

  return JSON.stringify(data, null, 2);
}

export function exportCeramicSupplierData(
  globalSpecs: GlobalSpecs,
  projectName: string,
  customerName: string,
  quantitySummary: SpQuantitySummary,
): string {
  const spec = extractSpSpecificationSummary(globalSpecs);

  const data = {
    projectName,
    customerName,
    specification: {
      ceramicType: spec.internalLining.ceramicType,
      liningType: spec.internalLining.liningType,
    },
    quantities: {
      internalAreaM2: quantitySummary.totalInternalAreaM2,
      ceramicTiles: quantitySummary.totalCeramicTiles,
    },
  };

  return JSON.stringify(data, null, 2);
}
