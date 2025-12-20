import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ParsedBoqData, ParsedBoqLineItem } from './dto/upload-boq.dto';

@Injectable()
export class BoqParserService {
  private readonly validItemTypes = [
    'straight_pipe',
    'bend',
    'fitting',
    'flange',
    'valve',
    'support',
    'coating',
    'lining',
    'custom',
  ];

  private readonly columnMappings: Record<string, string[]> = {
    itemCode: ['item code', 'itemcode', 'code', 'item no', 'item number', 'item_code', 'no', 'ref'],
    description: ['description', 'desc', 'item description', 'item', 'name', 'material', 'product'],
    itemType: ['item type', 'itemtype', 'type', 'item_type', 'category'],
    unitOfMeasure: ['unit', 'uom', 'unit of measure', 'units', 'measure', 'unit_of_measure'],
    quantity: ['quantity', 'qty', 'amount', 'count', 'no of items', 'no.'],
    unitWeightKg: ['unit weight', 'unit weight kg', 'weight', 'unit_weight_kg', 'kg', 'weight (kg)'],
    unitPrice: ['unit price', 'price', 'unit cost', 'cost', 'rate', 'unit_price', 'price (zar)'],
    notes: ['notes', 'remarks', 'comments', 'note', 'remark'],
    drawingReference: ['drawing ref', 'drawing reference', 'drawing', 'drawing_reference', 'dwg ref', 'dwg'],
  };

  parseExcel(buffer: Buffer): ParsedBoqData {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException('Excel file has no sheets');
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        throw new BadRequestException('Excel file has no data rows');
      }

      return this.parseJsonData(jsonData as Record<string, any>[]);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
    }
  }

  private parseJsonData(data: Record<string, any>[]): ParsedBoqData {
    const result: ParsedBoqData = {
      lineItems: [],
      errors: [],
      warnings: [],
    };

    if (data.length === 0) {
      result.errors.push('No data rows found in the file');
      return result;
    }

    // Get headers from first row
    const headers = Object.keys(data[0]);
    const headerMap = this.mapHeaders(headers);

    // Check for required columns
    if (!headerMap.description) {
      result.errors.push('Required column "Description" not found. Please ensure your file has a Description column.');
      return result;
    }

    if (!headerMap.quantity) {
      result.errors.push('Required column "Quantity" not found. Please ensure your file has a Quantity column.');
      return result;
    }

    // Parse each row
    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel row number (1-indexed, plus header row)

      try {
        const lineItem = this.parseRow(row, headerMap, rowNum, result.warnings);
        if (lineItem) {
          result.lineItems.push(lineItem);
        }
      } catch (error) {
        result.errors.push(`Row ${rowNum}: ${error.message}`);
      }
    });

    if (result.lineItems.length === 0 && result.errors.length === 0) {
      result.errors.push('No valid line items could be parsed from the file');
    }

    return result;
  }

  private mapHeaders(headers: string[]): Record<string, string | undefined> {
    const headerMap: Record<string, string | undefined> = {};

    for (const [field, aliases] of Object.entries(this.columnMappings)) {
      for (const header of headers) {
        const normalizedHeader = header.toLowerCase().trim();
        if (aliases.includes(normalizedHeader)) {
          headerMap[field] = header;
          break;
        }
      }
    }

    return headerMap;
  }

  private parseRow(
    row: Record<string, any>,
    headerMap: Record<string, string | undefined>,
    rowNum: number,
    warnings: string[],
  ): ParsedBoqLineItem | null {
    // Get description (required)
    const description = this.getStringValue(row, headerMap.description);
    if (!description || description.trim() === '') {
      warnings.push(`Row ${rowNum}: Skipped - empty description`);
      return null;
    }

    // Get quantity (required)
    const quantityRaw = this.getNumericValue(row, headerMap.quantity);
    if (quantityRaw === undefined || quantityRaw <= 0) {
      warnings.push(`Row ${rowNum}: Skipped - invalid or zero quantity`);
      return null;
    }

    // Get item type with auto-detection
    let itemType = this.getStringValue(row, headerMap.itemType)?.toLowerCase();
    if (!itemType || !this.validItemTypes.includes(itemType)) {
      itemType = this.detectItemType(description);
      if (itemType !== 'custom') {
        warnings.push(`Row ${rowNum}: Auto-detected item type as "${itemType}"`);
      }
    }

    // Get unit of measure with default
    let unitOfMeasure = this.getStringValue(row, headerMap.unitOfMeasure);
    if (!unitOfMeasure) {
      unitOfMeasure = this.detectUnitOfMeasure(description, itemType);
      warnings.push(`Row ${rowNum}: Using default unit of measure "${unitOfMeasure}"`);
    }

    const lineItem: ParsedBoqLineItem = {
      itemCode: this.getStringValue(row, headerMap.itemCode),
      description: description.trim(),
      itemType,
      unitOfMeasure,
      quantity: quantityRaw,
      unitWeightKg: this.getNumericValue(row, headerMap.unitWeightKg),
      unitPrice: this.getNumericValue(row, headerMap.unitPrice),
      notes: this.getStringValue(row, headerMap.notes),
      drawingReference: this.getStringValue(row, headerMap.drawingReference),
    };

    return lineItem;
  }

  private getStringValue(row: Record<string, any>, header?: string): string | undefined {
    if (!header) return undefined;
    const value = row[header];
    if (value === null || value === undefined || value === '') return undefined;
    return String(value).trim();
  }

  private getNumericValue(row: Record<string, any>, header?: string): number | undefined {
    if (!header) return undefined;
    const value = row[header];
    if (value === null || value === undefined || value === '') return undefined;

    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? undefined : num;
  }

  private detectItemType(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('pipe') && !desc.includes('fitting') && !desc.includes('bend')) {
      return 'straight_pipe';
    }
    if (desc.includes('bend') || desc.includes('elbow')) {
      return 'bend';
    }
    if (desc.includes('tee') || desc.includes('reducer') || desc.includes('cap') ||
        desc.includes('nipple') || desc.includes('coupling') || desc.includes('fitting')) {
      return 'fitting';
    }
    if (desc.includes('flange')) {
      return 'flange';
    }
    if (desc.includes('valve') || desc.includes('gate') || desc.includes('ball') ||
        desc.includes('check') || desc.includes('butterfly')) {
      return 'valve';
    }
    if (desc.includes('support') || desc.includes('hanger') || desc.includes('bracket') ||
        desc.includes('clamp') || desc.includes('anchor')) {
      return 'support';
    }
    if (desc.includes('coating') || desc.includes('paint') || desc.includes('external')) {
      return 'coating';
    }
    if (desc.includes('lining') || desc.includes('internal') || desc.includes('epoxy')) {
      return 'lining';
    }

    return 'custom';
  }

  private detectUnitOfMeasure(description: string, itemType: string): string {
    const desc = description.toLowerCase();

    // Check for explicit units in description
    if (desc.includes('meter') || desc.includes('metre') || desc.includes(' m ')) {
      return 'm';
    }
    if (desc.includes('kg') || desc.includes('kilogram')) {
      return 'kg';
    }
    if (desc.includes('set')) {
      return 'set';
    }
    if (desc.includes('pair')) {
      return 'pair';
    }

    // Default based on item type
    switch (itemType) {
      case 'straight_pipe':
        return 'm';
      case 'coating':
      case 'lining':
        return 'm²';
      default:
        return 'ea';
    }
  }

  // Simple PDF text extraction (basic support)
  parsePdf(buffer: Buffer): ParsedBoqData {
    // PDF parsing is complex and requires OCR for scanned documents
    // For now, return an error suggesting Excel format
    return {
      lineItems: [],
      errors: ['PDF parsing is not fully supported. For best results, please convert your PDF to Excel format first, or ensure the PDF contains structured tabular data.'],
      warnings: ['Tip: You can copy data from PDF to Excel and upload the Excel file for accurate parsing.'],
    };
  }
}
