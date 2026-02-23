import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  accessorKey: string;
}

export function exportToCSV(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
) {
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) => columns.map((col) => row[col.accessorKey] ?? ""));

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell);
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = "Sheet1",
) {
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) => columns.map((col) => row[col.accessorKey] ?? ""));

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${filename}.xlsx`);
}

export function exportToPDF(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
  metadata?: Record<string, string>,
) {
  const doc = new jsPDF();

  let startY = 15;
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, startY);
    startY += 10;
  }

  if (metadata) {
    doc.setFontSize(10);
    Object.entries(metadata).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, startY);
      startY += 6;
    });
    startY += 4;
  }

  const headers = columns.map((col) => col.header);
  const rows = data.map((row) => columns.map((col) => String(row[col.accessorKey] ?? "")));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 148, 136] },
  });

  doc.save(`${filename}.pdf`);
}

export async function exportToWord(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
  metadata?: Record<string, string>,
) {
  const headerCells = columns.map(
    (col) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: col.header, bold: true, size: 20, color: "FFFFFF" })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: { fill: "0D9488" },
        borders: cellBorders(),
      }),
  );

  const tableRows = data.map(
    (row) =>
      new TableRow({
        children: columns.map(
          (col) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(row[col.accessorKey] ?? ""), size: 20 })],
                }),
              ],
              borders: cellBorders(),
            }),
        ),
      }),
  );

  const docChildren: Paragraph[] = [];

  if (title) {
    docChildren.push(
      new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
    );
  }

  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `${key}: `, bold: true }), new TextRun({ text: value })],
          spacing: { after: 100 },
        }),
      );
    });
    docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));
  }

  const doc = new Document({
    sections: [
      {
        children: [
          ...docChildren,
          new Table({
            rows: [new TableRow({ children: headerCells, tableHeader: true }), ...tableRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

function cellBorders() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
  return { top: border, bottom: border, left: border, right: border };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
