import { Injectable } from "@nestjs/common";
import type { ExtractionResult } from "./excel-extractor.service";

// Extracted from NixService (#430 Phase 4) — pure, stateless rendering of an
// ExtractionResult into the markdown that Nix stores against secure documents.
@Injectable()
export class DocumentMarkdownFormatter {
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatPdfExtractionAsMarkdown(fileName: string, result: ExtractionResult): string {
    const lines: string[] = [
      `# ${fileName.replace(/\.[^.]+$/, "")}`,
      "",
      `> Processed by Nix on ${new Date().toISOString()}`,
      "",
    ];

    if (result.metadata) {
      lines.push("## Document Metadata", "");
      const meta = result.metadata;
      if (meta.projectName) lines.push(`- **Project Name:** ${meta.projectName}`);
      if (meta.projectReference) lines.push(`- **Project Reference:** ${meta.projectReference}`);
      if (meta.projectLocation) lines.push(`- **Location:** ${meta.projectLocation}`);
      if (meta.standard) lines.push(`- **Standard:** ${meta.standard}`);
      if (meta.materialGrade) lines.push(`- **Material Grade:** ${meta.materialGrade}`);
      if (meta.coating) lines.push(`- **Coating:** ${meta.coating}`);
      if (meta.lining) lines.push(`- **Lining:** ${meta.lining}`);
      lines.push("");
    }

    if (result.items && result.items.length > 0) {
      lines.push("## Extracted Items", "");
      lines.push("| # | Description | Type | Size | Material | Qty |");
      lines.push("|---|-------------|------|------|----------|-----|");

      result.items.forEach((item, index) => {
        const description = item.description || "-";
        const type = item.itemType || "-";
        const size = item.diameter
          ? `${item.diameter}${item.diameterUnit === "mm" ? "mm" : '"'}`
          : "-";
        const material = item.materialGrade || item.material || "-";
        const qty = item.quantity || "-";
        lines.push(
          `| ${index + 1} | ${description.substring(0, 50)} | ${type} | ${size} | ${material} | ${qty} |`,
        );
      });
      lines.push("");
    }

    if (result.specificationCells && result.specificationCells.length > 0) {
      lines.push("## Specification Data", "");
      result.specificationCells.forEach((spec) => {
        lines.push(`### ${spec.rawText || "Specification"}`);
        if (spec.parsedData) {
          const parsed = spec.parsedData;
          if (parsed.materialGrade) lines.push(`- **Material Grade:** ${parsed.materialGrade}`);
          if (parsed.wallThickness) lines.push(`- **Wall Thickness:** ${parsed.wallThickness}`);
          if (parsed.lining) lines.push(`- **Lining:** ${parsed.lining}`);
          if (parsed.externalCoating) lines.push(`- **Coating:** ${parsed.externalCoating}`);
          if (parsed.standard) lines.push(`- **Standard:** ${parsed.standard}`);
          if (parsed.schedule) lines.push(`- **Schedule:** ${parsed.schedule}`);
        }
        lines.push("");
      });
    }

    lines.push("---", "");
    lines.push(`*Source file: ${fileName}*`);
    lines.push(`*Total rows processed: ${result.totalRows}*`);
    lines.push(`*Items extracted: ${result.items?.length || 0}*`);

    return lines.join("\n");
  }

  formatExcelExtractionAsMarkdown(fileName: string, result: ExtractionResult): string {
    const lines: string[] = [
      `# ${fileName.replace(/\.[^.]+$/, "")}`,
      "",
      `> Processed by Nix on ${new Date().toISOString()}`,
      "",
      `**Sheet:** ${result.sheetName || "Unknown"}`,
      "",
    ];

    if (result.metadata) {
      lines.push("## Document Metadata", "");
      const meta = result.metadata;
      if (meta.projectName) lines.push(`- **Project Name:** ${meta.projectName}`);
      if (meta.projectReference) lines.push(`- **Project Reference:** ${meta.projectReference}`);
      if (meta.projectLocation) lines.push(`- **Location:** ${meta.projectLocation}`);
      if (meta.standard) lines.push(`- **Standard:** ${meta.standard}`);
      if (meta.materialGrade) lines.push(`- **Material Grade:** ${meta.materialGrade}`);
      lines.push("");
    }

    if (result.items && result.items.length > 0) {
      lines.push("## Extracted Items", "");
      lines.push("| # | Description | Type | Size | Material | Qty |");
      lines.push("|---|-------------|------|------|----------|-----|");

      result.items.forEach((item, index) => {
        const description = item.description || "-";
        const type = item.itemType || "-";
        const size = item.diameter
          ? `${item.diameter}${item.diameterUnit === "mm" ? "mm" : '"'}`
          : "-";
        const material = item.materialGrade || item.material || "-";
        const qty = item.quantity || "-";
        lines.push(
          `| ${index + 1} | ${description.substring(0, 50)} | ${type} | ${size} | ${material} | ${qty} |`,
        );
      });
      lines.push("");
    }

    lines.push("---", "");
    lines.push(`*Source file: ${fileName}*`);
    lines.push(`*Total rows processed: ${result.totalRows}*`);
    lines.push(`*Items extracted: ${result.items?.length || 0}*`);

    return lines.join("\n");
  }

  formatWordExtractionAsMarkdown(
    fileName: string,
    result: ExtractionResult & { rawText?: string },
  ): string {
    const lines: string[] = [
      `# ${fileName.replace(/\.[^.]+$/, "")}`,
      "",
      `> Processed by Nix on ${new Date().toISOString()}`,
      "",
    ];

    if (result.metadata) {
      lines.push("## Document Metadata", "");
      const meta = result.metadata;
      if (meta.projectName) lines.push(`- **Project Name:** ${meta.projectName}`);
      if (meta.projectReference) lines.push(`- **Project Reference:** ${meta.projectReference}`);
      if (meta.projectLocation) lines.push(`- **Location:** ${meta.projectLocation}`);
      if (meta.standard) lines.push(`- **Standard:** ${meta.standard}`);
      if (meta.materialGrade) lines.push(`- **Material Grade:** ${meta.materialGrade}`);
      lines.push("");
    }

    if (result.items && result.items.length > 0) {
      lines.push("## Extracted Items", "");
      lines.push("| # | Description | Type | Size | Material | Qty |");
      lines.push("|---|-------------|------|------|----------|-----|");

      result.items.forEach((item, index) => {
        const description = item.description || "-";
        const type = item.itemType || "-";
        const size = item.diameter
          ? `${item.diameter}${item.diameterUnit === "mm" ? "mm" : '"'}`
          : "-";
        const material = item.materialGrade || item.material || "-";
        const qty = item.quantity || "-";
        lines.push(
          `| ${index + 1} | ${description.substring(0, 50)} | ${type} | ${size} | ${material} | ${qty} |`,
        );
      });
      lines.push("");
    }

    if (result.rawText) {
      lines.push("## Document Content", "");
      lines.push(result.rawText);
      lines.push("");
    }

    lines.push("---", "");
    lines.push(`*Source file: ${fileName}*`);
    lines.push(`*Total lines processed: ${result.totalRows}*`);
    lines.push(`*Items extracted: ${result.items?.length || 0}*`);

    return lines.join("\n");
  }

  formatTextAsMarkdown(fileName: string, content: string): string {
    const lines: string[] = [
      `# ${fileName.replace(/\.[^.]+$/, "")}`,
      "",
      `> Processed by Nix on ${new Date().toISOString()}`,
      "",
      "## Content",
      "",
      content,
      "",
      "---",
      `*Source file: ${fileName}*`,
    ];

    return lines.join("\n");
  }

  generateDescription(metadata: Record<string, unknown>, content: string): string {
    const parts: string[] = [];

    if (metadata.projectName) {
      parts.push(`Project: ${metadata.projectName}`);
    }
    if (metadata.projectReference) {
      parts.push(`Ref: ${metadata.projectReference}`);
    }

    if (parts.length === 0) {
      const firstLine = content
        .split("\n")
        .find((line) => line.trim() && !line.startsWith("#") && !line.startsWith(">"));
      if (firstLine) {
        parts.push(firstLine.trim().substring(0, 100));
      }
    }

    return parts.join(" | ") || "Nix processed document";
  }
}
