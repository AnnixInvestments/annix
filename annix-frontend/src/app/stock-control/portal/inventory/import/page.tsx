"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import type { ImportResult } from "@/app/lib/api/stockControlApi";

type ImportStep = "upload" | "preview" | "result";

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      setIsUploading(true);
      const rows = await stockControlApiClient.uploadImportFile(selectedFile);
      setParsedRows(rows as Record<string, unknown>[]);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      setError(null);
      const importResult = await stockControlApiClient.confirmImport(parsedRows);
      setResult(importResult);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import data");
    } finally {
      setIsConfirming(false);
    }
  };

  const resetImport = () => {
    setStep("upload");
    setFile(null);
    setParsedRows([]);
    setResult(null);
    setError(null);
  };

  const columnHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href="/stock-control/portal/inventory"
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Stock Items</h1>
          <p className="mt-1 text-sm text-gray-600">Upload an Excel or PDF file to import stock items</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {step === "upload" && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf,.csv"
                onChange={handleInputChange}
                className="hidden"
              />
              {isUploading ? (
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Parsing file...</p>
                </div>
              ) : (
                <>
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-4 text-lg font-medium text-gray-900">
                    Drop your file here, or click to browse
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Supports Excel (.xlsx, .xls), PDF, and CSV files
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Import Preview</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {file?.name} - {parsedRows.length} rows parsed
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming || parsedRows.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isConfirming ? "Importing..." : `Confirm Import (${parsedRows.length} rows)`}
                </button>
              </div>
            </div>
            {parsedRows.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-sm font-medium text-gray-900">No data found</h3>
                <p className="mt-1 text-sm text-gray-500">The uploaded file contained no parseable rows.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                      {columnHeaders.map((header) => (
                        <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedRows.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        {columnHeaders.map((header) => (
                          <td key={header} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {String(row[header] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Import Results</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.created}</div>
                  <div className="text-sm text-green-600">Created</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
                  <div className="text-sm text-blue-600">Updated</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Errors</h4>
                  <div className="bg-red-50 rounded-lg p-4 space-y-2">
                    {result.errors.map((err, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <span className="font-medium">Row {err.row}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center space-x-3">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Import Another File
                </button>
                <Link
                  href="/stock-control/portal/inventory"
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700"
                >
                  View Inventory
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
