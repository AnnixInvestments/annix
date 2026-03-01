"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
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
import { FileDropZone } from "./FileDropZone";
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
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function parseExcelClientSide(file: File): Promise<AnalyzedProductLine[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

        const headerMapping = detectHeaders(rows[0] || {});
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
          .filter((line) => line.title || line.compound || line.baseCostPerKg !== null);

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
  for (const key of possibleKeys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return null;
}

function extractNumber(row: Record<string, unknown>, possibleKeys: string[]): number | null {
  for (const key of possibleKeys) {
    const value = row[key];
    if (value !== null && value !== undefined) {
      const strValue = String(value)
        .replace(/[R$,\s]/g, "")
        .trim();
      const num = parseFloat(strValue);
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

export function ProductImportModal({
  isOpen,
  onClose,
  onImportComplete,
  codings,
}: ProductImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeProductFilesResult | null>(null);
  const [editableProducts, setEditableProducts] = useState<EditableProductLine[]>([]);
  const [costSettings, setCostSettings] = useState<CostSettings | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportProductsResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setError(null);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const allLines: AnalyzedProductLine[] = [];
      const analyzedFiles: AnalyzedProductData[] = [];

      for (const file of selectedFiles) {
        const isExcel =
          file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");

        if (isExcel) {
          const lines = await parseExcelClientSide(file);
          allLines.push(...lines);
          analyzedFiles.push({
            filename: file.name,
            fileType: "excel",
            lines,
            confidence: lines.length > 0 ? 0.9 : 0,
            errors: [],
          });
        } else {
          const result = await auRubberApiClient.analyzeProductFiles([file]);
          result.files.forEach((f) => {
            allLines.push(...f.lines);
            analyzedFiles.push(f);
          });
        }
      }

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
      const rows = productsToImport.map((p) => ({
        title: p.title || undefined,
        type: p.type || undefined,
        compound: p.compound || undefined,
        colour: p.colour || undefined,
        hardness: p.hardness || undefined,
        grade: p.grade || undefined,
        curingMethod: p.curingMethod || undefined,
        specificGravity: p.specificGravity ?? undefined,
        costPerKg: p.baseCostPerKg ?? undefined,
        markup: costSettings
          ? (costSettings.categoryMarkups.find(
              (m) => m.compoundType.toLowerCase() === p.compound?.toLowerCase(),
            )?.markupPercent ?? costSettings.defaultMarginPercent)
          : undefined,
      }));

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
    setSelectedFiles([]);
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

  if (!isOpen) return null;

  const stepNumber = step === "upload" ? 1 : step === "cost-builder" ? 2 : 3;
  const stepTitles = {
    upload: "Upload Files",
    "cost-builder": "Configure Pricing",
    review: "Review & Import",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Products</h2>
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
                      <div
                        className={`w-8 h-0.5 ${n < stepNumber ? "bg-green-500" : "bg-gray-200"}`}
                      />
                    )}
                  </div>
                ))}
                <span className="ml-2 text-sm text-gray-600">{stepTitles[step]}</span>
              </div>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            {step === "upload" && !importResult && (
              <div className="space-y-6">
                <FileDropZone
                  onFilesSelected={handleFilesSelected}
                  accept={ACCEPTED_FILE_TYPES}
                  multiple={true}
                  disabled={isAnalyzing}
                  className="border-2 border-dashed rounded-lg min-h-[200px]"
                >
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Upload className="w-16 h-16 mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-700">
                      Drag & drop price list files here
                    </p>
                    <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                    <p className="text-xs text-gray-400 mt-3">
                      Excel (.xlsx, .xls), PDF, or Word (.docx) files
                    </p>
                  </div>
                </FileDropZone>

                {selectedFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Selected Files ({selectedFiles.length})
                    </h4>
                    <ul className="divide-y divide-gray-200 border rounded-md">
                      {selectedFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                              {file.name.split(".").pop()?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {step === "cost-builder" && costSettings && (
              <ProductCostBuilder
                detectedCompounds={uniqueCompounds}
                onApply={handleApplyCostSettings}
              />
            )}

            {step === "review" && !importResult && costSettings && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {editableProducts.length} product{editableProducts.length !== 1 ? "s" : ""}{" "}
                    ready to import
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
                            <th className="px-3 py-2 text-left font-medium text-gray-500">
                              Errors
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importResult.results
                            .filter((r) => r.status === "failed")
                            .map((result) => (
                              <tr key={result.rowIndex}>
                                <td className="px-3 py-2 text-gray-500">{result.rowIndex + 1}</td>
                                <td className="px-3 py-2">{result.title || "-"}</td>
                                <td className="px-3 py-2 text-red-600">
                                  {result.errors.join("; ")}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50">
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
                  disabled={selectedFiles.length === 0 || isAnalyzing}
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
                  disabled={isImporting || editableProducts.filter((p) => p.selected).length === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${editableProducts.filter((p) => p.selected).length} Products`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
