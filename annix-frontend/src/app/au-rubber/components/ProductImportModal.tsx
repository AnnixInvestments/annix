"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { FileImportModal } from "@/app/components/modals/FileImportModal";
import {
  type AnalyzedProductData,
  type AnalyzedProductLine,
  type AnalyzeProductFilesResult,
  auRubberApiClient,
} from "@/app/lib/api/auRubberApi";
import type {
  ImportProductsResultDto,
  RubberProductCodingDto,
} from "@/app/lib/api/rubberPortalApi";
import { useFileUpload } from "@/app/lib/hooks/useFileUpload";
import { type CostSettings, ProductCostBuilder } from "./ProductCostBuilder";
import {
  type EditableProductLine,
  ProductPreviewTable,
  recalculatePrices,
} from "./ProductPreviewTable";

type ImportStep = "upload" | "cost-builder" | "review";

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  codings: RubberProductCodingDto[];
}

const ACCEPTED_FILE_TYPES =
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.pdf,application/pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff,image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function parseExcelClientSide(file: File): Promise<AnalyzedProductLine[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawLineTitle = line.title;
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

        const firstRow = rows[0];
        const headerMapping = detectHeaders(firstRow ? firstRow : {});
        const lines = rows
          .map((row, index) => {
            const title = extractString(row, headerMapping.title);
            const type = extractString(row, headerMapping.type);
            const compound = extractString(row, headerMapping.compound);
            const colour = extractString(row, headerMapping.colour);
            const hardness = extractString(row, headerMapping.hardness);
            const grade = extractString(row, headerMapping.grade);
            const curingMethod = extractString(row, headerMapping.curingMethod);
            const specificGravity = extractNumber(row, headerMapping.specificGravity);
            const baseCostPerKg = extractNumber(row, headerMapping.baseCostPerKg);

            const hasTitle = !!title;
            const hasCost = baseCostPerKg !== null;

            return {
              lineNumber: index + 1,
              title,
              type,
              compound,
              colour,
              hardness,
              grade,
              curingMethod,
              specificGravity,
              baseCostPerKg,
              confidence: hasTitle && hasCost ? 0.95 : hasTitle ? 0.7 : 0.3,
              rawText: JSON.stringify(row),
            };
          })
          .filter((line) => rawLineTitle || line.compound || line.baseCostPerKg !== null);

        resolve(lines);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function detectHeaders(firstRow: Record<string, unknown>): Record<string, string[]> {
  const keys = Object.keys(firstRow);
  const findKeys = (patterns: string[]) =>
    keys.filter((key) => {
      const normalizedKey = key
        .toLowerCase()
        .replace(/[_\-\s]+/g, " ")
        .trim();
      return patterns.some(
        (p) => normalizedKey === p || normalizedKey.includes(p) || p.includes(normalizedKey),
      );
    });

  return {
    title: findKeys(["title", "name", "product", "product name", "description", "item"]),
    type: findKeys(["type", "product type", "category"]),
    compound: findKeys(["compound", "rubber compound", "material", "rubber type", "rubber"]),
    colour: findKeys(["colour", "color", "col"]),
    hardness: findKeys(["hardness", "shore", "shore a", "durometer"]),
    grade: findKeys(["grade", "quality"]),
    curingMethod: findKeys(["curing", "curing method", "cure", "vulcanization"]),
    specificGravity: findKeys(["specific gravity", "sg", "density", "spec grav"]),
    baseCostPerKg: findKeys([
      "cost",
      "price",
      "cost per kg",
      "price per kg",
      "cost/kg",
      "price/kg",
      "unit price",
      "rate",
      "zar",
      "r/kg",
    ]),
  };
}

function extractString(row: Record<string, unknown>, possibleKeys: string[]): string | null {
  const matchedKey = possibleKeys.find((key) => {
    const value = row[key];
    return value !== null && value !== undefined && String(value).trim();
  });
  return matchedKey ? String(row[matchedKey]).trim() : null;
}

function extractNumber(row: Record<string, unknown>, possibleKeys: string[]): number | null {
  return possibleKeys.reduce<number | null>((found, key) => {
    if (found !== null) return found;
    const value = row[key];
    if (value === null || value === undefined) return null;
    const strValue = String(value)
      .replace(/[R$,\s]/g, "")
      .trim();
    const num = parseFloat(strValue);
    return Number.isNaN(num) ? null : num;
  }, null);
}

export function ProductImportModal(props: ProductImportModalProps) {
  const { isOpen, onClose, onImportComplete, codings } = props;
  const [step, setStep] = useState<ImportStep>("upload");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeProductFilesResult | null>(null);
  const [editableProducts, setEditableProducts] = useState<EditableProductLine[]>([]);
  const [costSettings, setCostSettings] = useState<CostSettings | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportProductsResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);

  const fileUpload = useFileUpload({ accept: ACCEPTED_FILE_TYPES, multiple: true });

  const handleAnalyze = async () => {
    if (fileUpload.files.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const { allLines, analyzedFiles } = await fileUpload.files.reduce(
        async (accPromise, file) => {
          const acc = await accPromise;
          const isExcel =
            file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");

          if (isExcel) {
            const lines = await parseExcelClientSide(file);
            return {
              allLines: [...acc.allLines, ...lines],
              analyzedFiles: [
                ...acc.analyzedFiles,
                {
                  filename: file.name,
                  fileType: "excel" as const,
                  lines,
                  confidence: lines.length > 0 ? 0.9 : 0,
                  errors: [],
                },
              ],
            };
          }

          const apiResult = await auRubberApiClient.analyzeProductFiles([file]);
          return {
            allLines: [...acc.allLines, ...apiResult.files.flatMap((f) => f.lines)],
            analyzedFiles: [...acc.analyzedFiles, ...apiResult.files],
          };
        },
        Promise.resolve({
          allLines: [] as AnalyzedProductLine[],
          analyzedFiles: [] as AnalyzedProductData[],
        }),
      );

      const result: AnalyzeProductFilesResult = {
        files: analyzedFiles,
        totalLines: allLines.length,
      };

      setAnalysisResult(result);

      const detectedCompounds = [
        ...new Set(allLines.map((l) => l.compound).filter((c): c is string => !!c)),
      ];

      setEditableProducts(
        allLines.map((line) => ({
          ...line,
          calculatedPrice: null,
          selected: true,
        })),
      );

      setCostSettings({
        baseMaterialPercent: 100,
        processingFeePerKg: 0,
        overheadPercent: 0,
        defaultMarginPercent: 30,
        categoryMarkups: detectedCompounds.map((compound) => ({
          compoundType: compound,
          markupPercent: 30,
        })),
      });

      setStep("cost-builder");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze files");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyCostSettings = (settings: CostSettings) => {
    setCostSettings(settings);
    setEditableProducts((prev) => recalculatePrices(prev, settings));
    setStep("review");
  };

  const handleUpdateProduct = (index: number, updates: Partial<EditableProductLine>) => {
    setEditableProducts((prev) => {
      const newProducts = [...prev];
      newProducts[index] = { ...newProducts[index], ...updates };
      return newProducts;
    });
  };

  const handleDeleteProduct = (index: number) => {
    setEditableProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleSelect = (index: number) => {
    setEditableProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p)),
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setEditableProducts((prev) => prev.map((p) => ({ ...p, selected })));
  };

  const handleImport = async () => {
    const productsToImport = editableProducts.filter((p) => p.selected);
    if (productsToImport.length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      const rows = productsToImport.map((p) => {
        const pTitle = p.title;
        const pType = p.type;
        const pCompound = p.compound;
        const pColour = p.colour;
        const pHardness = p.hardness;
        const pGrade = p.grade;
        const pCuringMethod = p.curingMethod;
        const pSpecificGravity = p.specificGravity;
        const pBaseCostPerKg = p.baseCostPerKg;
        const matchedMarkup = costSettings
          ? costSettings.categoryMarkups.find(
              (m) => m.compoundType.toLowerCase() === pCompound?.toLowerCase(),
            )
          : null;
        const markupPercent = matchedMarkup?.markupPercent;
        const defaultMargin = costSettings?.defaultMarginPercent;
        const markup = costSettings ? (markupPercent ? markupPercent : defaultMargin) : undefined;
        return {
          title: pTitle ? pTitle : undefined,
          type: pType ? pType : undefined,
          compound: pCompound ? pCompound : undefined,
          colour: pColour ? pColour : undefined,
          hardness: pHardness ? pHardness : undefined,
          grade: pGrade ? pGrade : undefined,
          curingMethod: pCuringMethod ? pCuringMethod : undefined,
          specificGravity: pSpecificGravity != null ? pSpecificGravity : undefined,
          costPerKg: pBaseCostPerKg != null ? pBaseCostPerKg : undefined,
          markup,
        };
      });

      const result = await auRubberApiClient.importProducts({ rows, updateExisting });
      setImportResult(result);

      if (result.created > 0 || result.updated > 0) {
        onImportComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    fileUpload.clearFiles();
    setAnalysisResult(null);
    setEditableProducts([]);
    setCostSettings(null);
    setImportResult(null);
    setError(null);
    setUpdateExisting(false);
    onClose();
  };

  const handleBack = () => {
    if (step === "cost-builder") {
      setStep("upload");
    } else if (step === "review") {
      setStep("cost-builder");
    }
  };

  const detectedCompounds =
    analysisResult?.files.flatMap((f) => f.lines.map((l) => l.compound).filter(Boolean)) || [];
  const uniqueCompounds = [...new Set(detectedCompounds)] as string[];

  const stepNumber = step === "upload" ? 1 : step === "cost-builder" ? 2 : 3;
  const stepTitles = {
    upload: "Upload Files",
    "cost-builder": "Configure Pricing",
    review: "Review & Import",
  };

  const selectedCount = editableProducts.filter((p) => p.selected).length;
  const combinedError = error || fileUpload.error;

  const stepIndicator = (
    <div className="flex items-center gap-2 mt-1">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              n === stepNumber
                ? "bg-yellow-600 text-white"
                : n < stepNumber
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
            }`}
          >
            {n}
          </div>
          {n < 3 && (
            <div className={`w-8 h-0.5 ${n < stepNumber ? "bg-green-500" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm text-gray-600">{stepTitles[step]}</span>
    </div>
  );

  const footerLeft = (
    <div>
      {step !== "upload" && !importResult && (
        <button
          onClick={handleBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
      )}
    </div>
  );

  const footerRight = (
    <div className="flex gap-3">
      <button
        onClick={handleClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        {importResult ? "Close" : "Cancel"}
      </button>

      {step === "upload" && !importResult && (
        <button
          onClick={handleAnalyze}
          disabled={fileUpload.files.length === 0 || isAnalyzing}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Files"
          )}
        </button>
      )}

      {step === "review" && !importResult && (
        <button
          onClick={handleImport}
          disabled={isImporting || selectedCount === 0}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            `Import ${selectedCount} Products`
          )}
        </button>
      )}
    </div>
  );

  return (
    <FileImportModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Products"
      accept={ACCEPTED_FILE_TYPES}
      multiple={true}
      error={combinedError}
      hideDropzone={step !== "upload" || !!importResult}
      hideFooter={false}
      maxWidth="max-w-6xl"
      files={fileUpload.files}
      onFilesSelected={fileUpload.addFiles}
      onRemoveFile={fileUpload.removeFile}
      isDragging={fileUpload.isDragging}
      dragProps={fileUpload.dragProps}
      dropzoneLabel="Drag & drop price list files here"
      dropzoneSubLabel="or click to browse"
      dropzoneHint="Excel (.xlsx, .xls), PDF, or Word (.docx) files"
      footerLeft={footerLeft}
      footerRight={footerRight}
    >
      {step === "upload" && !importResult && stepIndicator}

      {step === "cost-builder" && costSettings && (
        <>
          {stepIndicator}
          <ProductCostBuilder
            detectedCompounds={uniqueCompounds}
            onApply={handleApplyCostSettings}
          />
        </>
      )}

      {step === "review" && !importResult && costSettings && (
        <>
          {stepIndicator}
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {editableProducts.length} product{editableProducts.length !== 1 ? "s" : ""} ready to
                import
              </p>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Update existing products</span>
              </label>
            </div>

            <ProductPreviewTable
              products={editableProducts}
              costSettings={costSettings}
              codings={codings}
              onUpdate={handleUpdateProduct}
              onDelete={handleDeleteProduct}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
            />
          </div>
        </>
      )}

      {importResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{importResult.totalRows}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
              <div className="text-sm text-green-600">Created</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
              <div className="text-sm text-blue-600">Updated</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-500">{importResult.skipped}</div>
              <div className="text-sm text-gray-500">Skipped</div>
            </div>
          </div>

          {importResult.results.some((r) => r.status === "failed") && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <h3 className="font-medium text-red-800">Failed Rows</h3>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Title</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importResult.results
                      .filter((r) => r.status === "failed")
                      .map((result) => {
                        const resultTitle = result.title;
                        const titleDisplay = resultTitle ? resultTitle : "-";
                        return (
                          <tr key={result.rowIndex}>
                            <td className="px-3 py-2 text-gray-500">{result.rowIndex + 1}</td>
                            <td className="px-3 py-2">{titleDisplay}</td>
                            <td className="px-3 py-2 text-red-600">{result.errors.join("; ")}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </FileImportModal>
  );
}
