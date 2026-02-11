#!/usr/bin/env ts-node

/**
 * Excel Dump Utility
 *
 * Reads an Excel file and outputs all sheets with their cell data in a readable format.
 * Useful for inspecting calculation spreadsheets, extracting formulas, and understanding
 * spreadsheet structure.
 *
 * Usage:
 *   pnpm ts-node src/nix/scripts/dump-excel.ts <path-to-excel-file> [options]
 *
 * Options:
 *   --sheet <name>     Only dump a specific sheet by name
 *   --formulas         Show formulas instead of calculated values
 *   --json             Output as JSON instead of text
 *   --csv              Output each sheet as CSV format
 *   --max-rows <n>     Limit rows per sheet (default: all)
 *   --max-cols <n>     Limit columns per sheet (default: all)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as ExcelJS from "exceljs";

interface DumpOptions {
  sheetName?: string;
  showFormulas: boolean;
  outputJson: boolean;
  outputCsv: boolean;
  maxRows?: number;
  maxCols?: number;
}

interface CellData {
  ref: string;
  value: any;
  formula?: string;
  type: string;
  format?: string;
}

interface RowData {
  rowNumber: number;
  cells: CellData[];
}

interface SheetData {
  name: string;
  rowCount: number;
  columnCount: number;
  mergedCells: string[];
  rows: RowData[];
}

interface WorkbookData {
  fileName: string;
  sheetCount: number;
  sheetNames: string[];
  sheets: SheetData[];
}

function getCellValue(cell: ExcelJS.Cell, showFormulas: boolean): any {
  if (showFormulas && cell.formula) {
    return `=${cell.formula}`;
  }

  const value = cell.value;
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object") {
    // Rich text
    if ("richText" in value) {
      const richText = value as { richText: Array<{ text: string }> };
      return richText.richText.map((rt) => rt.text).join("");
    }
    // Formula result
    if ("result" in value) {
      const formulaValue = value as { formula?: string; result?: any };
      if (showFormulas && formulaValue.formula) {
        return `=${formulaValue.formula}`;
      }
      return formulaValue.result;
    }
    // Hyperlink
    if ("text" in value) {
      return (value as { text: string }).text;
    }
    // Date
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Error
    if ("error" in value) {
      return `#ERROR: ${(value as { error: string }).error}`;
    }
  }

  return value;
}

function getCellType(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "empty";
  if (cell.formula) return "formula";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  if (value instanceof Date) return "date";
  if (typeof value === "object") {
    if ("richText" in value) return "richText";
    if ("result" in value) return "formula";
    if ("text" in value) return "hyperlink";
    if ("error" in value) return "error";
  }
  return "unknown";
}

async function dumpExcel(filePath: string, options: DumpOptions): Promise<WorkbookData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const result: WorkbookData = {
    fileName: path.basename(filePath),
    sheetCount: workbook.worksheets.length,
    sheetNames: workbook.worksheets.map((ws) => ws.name),
    sheets: [],
  };

  for (const worksheet of workbook.worksheets) {
    // Filter by sheet name if specified
    if (options.sheetName && worksheet.name !== options.sheetName) {
      continue;
    }

    const sheetData: SheetData = {
      name: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount,
      mergedCells: [],
      rows: [],
    };

    // Get merged cells
    if (worksheet.model.merges) {
      sheetData.mergedCells = worksheet.model.merges;
    }

    // Process rows
    const maxRows = options.maxRows || worksheet.rowCount;
    const maxCols = options.maxCols || worksheet.columnCount;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > maxRows) return;

      const rowData: RowData = {
        rowNumber,
        cells: [],
      };

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > maxCols) return;

        const cellData: CellData = {
          ref: cell.address,
          value: getCellValue(cell, options.showFormulas),
          type: getCellType(cell),
        };

        if (cell.formula) {
          cellData.formula = cell.formula;
        }

        if (cell.numFmt && cell.numFmt !== "General") {
          cellData.format = cell.numFmt;
        }

        // Only include non-empty cells
        if (cellData.value !== null || cellData.formula) {
          rowData.cells.push(cellData);
        }
      });

      if (rowData.cells.length > 0) {
        sheetData.rows.push(rowData);
      }
    });

    result.sheets.push(sheetData);
  }

  return result;
}

function formatAsText(data: WorkbookData): string {
  const lines: string[] = [];

  lines.push("=".repeat(80));
  lines.push(`EXCEL FILE: ${data.fileName}`);
  lines.push(`Sheets: ${data.sheetCount} (${data.sheetNames.join(", ")})`);
  lines.push("=".repeat(80));
  lines.push("");

  for (const sheet of data.sheets) {
    lines.push("-".repeat(80));
    lines.push(`SHEET: ${sheet.name}`);
    lines.push(`Dimensions: ${sheet.rowCount} rows × ${sheet.columnCount} columns`);
    if (sheet.mergedCells.length > 0) {
      lines.push(`Merged cells: ${sheet.mergedCells.join(", ")}`);
    }
    lines.push("-".repeat(80));
    lines.push("");

    for (const row of sheet.rows) {
      const cellStrs = row.cells.map((cell) => {
        let str = `${cell.ref}: `;
        if (cell.formula && cell.type === "formula") {
          str += `=${cell.formula}`;
          if (cell.value !== null && cell.value !== undefined) {
            str += ` → ${cell.value}`;
          }
        } else {
          str += JSON.stringify(cell.value);
        }
        return str;
      });
      lines.push(`Row ${row.rowNumber}: ${cellStrs.join(" | ")}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function formatAsCsv(data: WorkbookData): string {
  const outputs: string[] = [];

  for (const sheet of data.sheets) {
    outputs.push(`### SHEET: ${sheet.name} ###`);

    // Find all unique columns
    const allCols = new Set<number>();
    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        const colMatch = cell.ref.match(/([A-Z]+)/);
        if (colMatch) {
          const colNum = colLetterToNumber(colMatch[1]);
          allCols.add(colNum);
        }
      }
    }

    const sortedCols = Array.from(allCols).sort((a, b) => a - b);
    const maxRow = Math.max(...sheet.rows.map((r) => r.rowNumber), 0);

    // Build a grid
    const grid: Map<string, any> = new Map();
    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        grid.set(cell.ref, cell.value);
      }
    }

    // Output as CSV
    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
      const values: string[] = [];
      for (const colNum of sortedCols) {
        const ref = `${colNumberToLetter(colNum)}${rowNum}`;
        const val = grid.get(ref);
        if (val === null || val === undefined) {
          values.push("");
        } else {
          // Escape CSV values
          const strVal = String(val);
          if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
            values.push(`"${strVal.replace(/"/g, '""')}"`);
          } else {
            values.push(strVal);
          }
        }
      }
      outputs.push(values.join(","));
    }

    outputs.push("");
  }

  return outputs.join("\n");
}

function colLetterToNumber(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result;
}

function colNumberToLetter(num: number): string {
  let result = "";
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Excel Dump Utility

Usage:
  pnpm ts-node src/nix/scripts/dump-excel.ts <path-to-excel-file> [options]

Options:
  --sheet <name>     Only dump a specific sheet by name
  --formulas         Show formulas instead of calculated values
  --json             Output as JSON instead of text
  --csv              Output each sheet as CSV format
  --max-rows <n>     Limit rows per sheet (default: all)
  --max-cols <n>     Limit columns per sheet (default: all)
  --output <file>    Write output to file instead of stdout

Examples:
  pnpm ts-node src/nix/scripts/dump-excel.ts calculator.xlsx
  pnpm ts-node src/nix/scripts/dump-excel.ts calculator.xlsx --formulas --json
  pnpm ts-node src/nix/scripts/dump-excel.ts calculator.xlsx --sheet "Reducers" --csv
    `);
    process.exit(0);
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const options: DumpOptions = {
    showFormulas: args.includes("--formulas"),
    outputJson: args.includes("--json"),
    outputCsv: args.includes("--csv"),
  };

  // Parse --sheet option
  const sheetIdx = args.indexOf("--sheet");
  if (sheetIdx !== -1 && args[sheetIdx + 1]) {
    options.sheetName = args[sheetIdx + 1];
  }

  // Parse --max-rows option
  const maxRowsIdx = args.indexOf("--max-rows");
  if (maxRowsIdx !== -1 && args[maxRowsIdx + 1]) {
    options.maxRows = parseInt(args[maxRowsIdx + 1], 10);
  }

  // Parse --max-cols option
  const maxColsIdx = args.indexOf("--max-cols");
  if (maxColsIdx !== -1 && args[maxColsIdx + 1]) {
    options.maxCols = parseInt(args[maxColsIdx + 1], 10);
  }

  // Parse --output option
  const outputIdx = args.indexOf("--output");
  const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

  try {
    console.error(`Reading Excel file: ${filePath}`);
    const data = await dumpExcel(filePath, options);

    let output: string;
    if (options.outputJson) {
      output = JSON.stringify(data, null, 2);
    } else if (options.outputCsv) {
      output = formatAsCsv(data);
    } else {
      output = formatAsText(data);
    }

    if (outputFile) {
      fs.writeFileSync(outputFile, output, "utf-8");
      console.error(`Output written to: ${outputFile}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error(`Error reading Excel file: ${error}`);
    process.exit(1);
  }
}

main();
