"use client";

import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

interface SpecificationSheetGeneratorProps {
  globalSpecs: GlobalSpecs;
  projectName?: string;
  customerName?: string;
}

export function SpecificationSheetGenerator({
  globalSpecs,
  projectName = "Project",
  customerName = "Customer",
}: SpecificationSheetGeneratorProps) {
  const generatePdfContent = () => {
    const externalSpec = {
      coatingType: globalSpecs.externalCoatingType || "Not specified",
      blastingGrade: globalSpecs.externalBlastingGrade || "Sa 2.5",
      primer: {
        type: globalSpecs.externalPrimerType || "Not specified",
        dft: globalSpecs.externalPrimerMicrons || 0,
      },
      intermediate: {
        type: globalSpecs.externalIntermediateType || "Not specified",
        dft: globalSpecs.externalIntermediateMicrons || 0,
      },
      topcoat: {
        type: globalSpecs.externalTopcoatType || "Not specified",
        dft: globalSpecs.externalTopcoatMicrons || 0,
        colour: globalSpecs.externalTopcoatColour || "Not specified",
      },
      totalDft:
        (globalSpecs.externalPrimerMicrons || 0) +
        (globalSpecs.externalIntermediateMicrons || 0) +
        (globalSpecs.externalTopcoatMicrons || 0),
    };

    const internalSpec = {
      liningType: globalSpecs.internalLiningType || "Not specified",
      rubberType: globalSpecs.internalRubberType,
      rubberThickness: globalSpecs.internalRubberThickness,
      ceramicType: globalSpecs.internalCeramicType,
      primerType: globalSpecs.internalPrimerType,
      primerDft: globalSpecs.internalPrimerMicrons,
      totalDft:
        (globalSpecs.internalPrimerMicrons || 0) +
        (globalSpecs.internalIntermediateMicrons || 0) +
        (globalSpecs.internalTopcoatMicrons || 0),
    };

    return { externalSpec, internalSpec };
  };

  const handleGeneratePdf = () => {
    const { externalSpec, internalSpec } = generatePdfContent();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Coating Specification Sheet</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    h3 { color: #4b5563; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
    th { background-color: #f3f4f6; font-weight: 600; }
    .header-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .header-info div { }
    .total-row { background-color: #dbeafe; font-weight: bold; }
    .note { font-size: 12px; color: #6b7280; margin-top: 20px; padding: 10px; background: #f9fafb; border-radius: 4px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Surface Protection Specification</h1>

  <div class="header-info">
    <div>
      <strong>Project:</strong> ${projectName}<br>
      <strong>Customer:</strong> ${customerName}
    </div>
    <div>
      <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
      <strong>Rev:</strong> A
    </div>
  </div>

  <h2>External Coating Specification</h2>
  <table>
    <tr>
      <th>Coating System</th>
      <td colspan="2">${externalSpec.coatingType}</td>
    </tr>
    <tr>
      <th>Surface Preparation</th>
      <td colspan="2">${externalSpec.blastingGrade} per ISO 8501-1</td>
    </tr>
  </table>

  <h3>Coating Schedule</h3>
  <table>
    <tr>
      <th>Coat</th>
      <th>Product</th>
      <th>DFT (microns)</th>
    </tr>
    <tr>
      <td>Primer</td>
      <td>${externalSpec.primer.type}</td>
      <td>${externalSpec.primer.dft}</td>
    </tr>
    <tr>
      <td>Intermediate</td>
      <td>${externalSpec.intermediate.type}</td>
      <td>${externalSpec.intermediate.dft}</td>
    </tr>
    <tr>
      <td>Topcoat</td>
      <td>${externalSpec.topcoat.type}</td>
      <td>${externalSpec.topcoat.dft}</td>
    </tr>
    <tr class="total-row">
      <td colspan="2">Total DFT</td>
      <td>${externalSpec.totalDft} microns</td>
    </tr>
  </table>

  ${
    externalSpec.topcoat.colour !== "Not specified"
      ? `
  <table>
    <tr>
      <th>Topcoat Colour</th>
      <td>${externalSpec.topcoat.colour}</td>
    </tr>
  </table>
  `
      : ""
  }

  <h2>Internal Lining Specification</h2>
  <table>
    <tr>
      <th>Lining Type</th>
      <td>${internalSpec.liningType}</td>
    </tr>
    ${
      internalSpec.rubberType
        ? `
    <tr>
      <th>Rubber Type</th>
      <td>${internalSpec.rubberType}</td>
    </tr>
    <tr>
      <th>Rubber Thickness</th>
      <td>${internalSpec.rubberThickness || "Per supplier recommendation"}</td>
    </tr>
    `
        : ""
    }
    ${
      internalSpec.ceramicType
        ? `
    <tr>
      <th>Ceramic Type</th>
      <td>${internalSpec.ceramicType}</td>
    </tr>
    `
        : ""
    }
    ${
      internalSpec.liningType === "Paint"
        ? `
    <tr>
      <th>Primer</th>
      <td>${internalSpec.primerType || "N/A"} - ${internalSpec.primerDft || 0}um</td>
    </tr>
    <tr class="total-row">
      <th>Total DFT</th>
      <td>${internalSpec.totalDft} microns</td>
    </tr>
    `
        : ""
    }
  </table>

  <div class="note">
    <strong>Notes:</strong>
    <ul>
      <li>All coatings to be applied in accordance with manufacturer's technical data sheets</li>
      <li>Surface preparation to be verified before coating application</li>
      <li>DFT measurements to be recorded as per ISO 2808</li>
      <li>Environmental conditions during application: RH <85%, Steel temp >3C above dew point</li>
    </ul>
  </div>

  <div class="note" style="margin-top: 40px; text-align: center; color: #9ca3af;">
    Generated by Annix RFQ System
  </div>
</body>
</html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const { externalSpec, internalSpec } = generatePdfContent();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Specification Sheet
        </h3>
        <button
          type="button"
          onClick={handleGeneratePdf}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print / PDF
        </button>
      </div>

      {/* Preview */}
      <div className="border border-gray-200 rounded p-4 bg-gray-50 space-y-4">
        {/* External */}
        <div>
          <h4 className="text-xs font-semibold text-gray-800 mb-2">External Coating</h4>
          <div className="bg-white rounded p-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">System:</span>
              <span className="font-medium">{externalSpec.coatingType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Surface Prep:</span>
              <span className="font-medium">{externalSpec.blastingGrade}</span>
            </div>
            {externalSpec.primer.dft > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Primer:</span>
                <span className="font-medium">
                  {externalSpec.primer.type} ({externalSpec.primer.dft}um)
                </span>
              </div>
            )}
            {externalSpec.intermediate.dft > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Intermediate:</span>
                <span className="font-medium">
                  {externalSpec.intermediate.type} ({externalSpec.intermediate.dft}um)
                </span>
              </div>
            )}
            {externalSpec.topcoat.dft > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Topcoat:</span>
                <span className="font-medium">
                  {externalSpec.topcoat.type} ({externalSpec.topcoat.dft}um)
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total DFT:</span>
              <span className="font-bold text-blue-600">{externalSpec.totalDft}um</span>
            </div>
          </div>
        </div>

        {/* Internal */}
        <div>
          <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal Lining</h4>
          <div className="bg-white rounded p-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{internalSpec.liningType}</span>
            </div>
            {internalSpec.rubberType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Rubber:</span>
                <span className="font-medium">{internalSpec.rubberType}</span>
              </div>
            )}
            {internalSpec.rubberThickness && (
              <div className="flex justify-between">
                <span className="text-gray-600">Thickness:</span>
                <span className="font-medium">{internalSpec.rubberThickness}</span>
              </div>
            )}
            {internalSpec.ceramicType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Ceramic:</span>
                <span className="font-medium">{internalSpec.ceramicType}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
