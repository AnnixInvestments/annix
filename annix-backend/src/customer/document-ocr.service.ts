import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

// pdf-parse doesn't have proper TypeScript support, use require
const pdfParse = require('pdf-parse');

export interface ExtractedDocumentData {
  success: boolean;
  vatNumber?: string;
  registrationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  rawText?: string;
  confidence: 'high' | 'medium' | 'low';
  ocrMethod: 'pdf-parse' | 'tesseract' | 'none';
  errors: string[];
}

export interface ValidationMismatch {
  field: 'vatNumber' | 'registrationNumber' | 'companyName' | 'streetAddress' | 'city' | 'provinceState' | 'postalCode';
  expected: string;
  extracted: string;
  similarity?: number;
}

export interface ValidationResult {
  isValid: boolean;
  mismatches: ValidationMismatch[];
  extractedData: ExtractedDocumentData;
  requiresManualReview: boolean;
  ocrFailed: boolean;
}

@Injectable()
export class DocumentOcrService {
  private readonly logger = new Logger(DocumentOcrService.name);

  // South African VAT Number: 10 digits starting with 4
  private readonly VAT_NUMBER_PATTERN = /\b4\d{9}\b/g;

  // South African Company Registration: yyyy/nnnnnn/nn
  private readonly REGISTRATION_NUMBER_PATTERN = /\b\d{4}\/\d{6}\/\d{2}\b/g;

  // South African Postal Code: 4 digits
  private readonly POSTAL_CODE_PATTERN = /\b\d{4}\b/g;

  // South African Provinces
  private readonly SA_PROVINCES = [
    'EASTERN CAPE',
    'FREE STATE',
    'GAUTENG',
    'KWAZULU-NATAL',
    'LIMPOPO',
    'MPUMALANGA',
    'NORTHERN CAPE',
    'NORTH WEST',
    'WESTERN CAPE',
  ];

  /**
   * Extract text from PDF document
   */
  async extractFromPdf(
    buffer: Buffer,
    documentType: 'vat' | 'registration',
  ): Promise<ExtractedDocumentData> {
    try {
      this.logger.log(`Extracting text from PDF (${documentType})`);

      const data = await pdfParse(buffer);
      const rawText = data.text;

      if (!rawText || rawText.trim().length < 10) {
        return {
          success: false,
          rawText: rawText || '',
          confidence: 'low',
          ocrMethod: 'pdf-parse',
          errors: ['PDF text extraction produced no usable text'],
        };
      }

      // Parse based on document type
      if (documentType === 'vat') {
        return this.parseVatDocument(rawText);
      } else {
        return this.parseRegistrationDocument(rawText);
      }
    } catch (error) {
      this.logger.error(`PDF extraction failed: ${error.message}`);
      return {
        success: false,
        confidence: 'low',
        ocrMethod: 'pdf-parse',
        errors: [error.message],
      };
    }
  }

  /**
   * Extract text from image document using Tesseract OCR
   */
  async extractFromImage(
    buffer: Buffer,
    documentType: 'vat' | 'registration',
  ): Promise<ExtractedDocumentData> {
    let worker;
    try {
      this.logger.log(`Extracting text from image (${documentType})`);

      worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      const rawText = data.text;

      await worker.terminate();

      if (!rawText || rawText.trim().length < 10) {
        return {
          success: false,
          rawText: rawText || '',
          confidence: 'low',
          ocrMethod: 'tesseract',
          errors: ['Image OCR produced no usable text'],
        };
      }

      // Determine confidence based on Tesseract's confidence score
      const confidence = data.confidence > 80 ? 'high' : data.confidence > 60 ? 'medium' : 'low';

      // Parse based on document type
      const parsed = documentType === 'vat'
        ? this.parseVatDocument(rawText)
        : this.parseRegistrationDocument(rawText);

      return {
        ...parsed,
        confidence,
        ocrMethod: 'tesseract',
      };
    } catch (error) {
      if (worker) {
        await worker.terminate();
      }
      this.logger.error(`Image OCR failed: ${error.message}`);
      return {
        success: false,
        confidence: 'low',
        ocrMethod: 'tesseract',
        errors: [error.message],
      };
    }
  }

  /**
   * Main method to extract document data based on file type
   */
  async extractDocumentData(
    file: Express.Multer.File,
    documentType: 'vat' | 'registration',
  ): Promise<ExtractedDocumentData> {
    const mimeType = file.mimetype;

    if (mimeType === 'application/pdf') {
      return this.extractFromPdf(file.buffer, documentType);
    } else if (mimeType.startsWith('image/')) {
      return this.extractFromImage(file.buffer, documentType);
    } else {
      return {
        success: false,
        confidence: 'low',
        ocrMethod: 'none',
        errors: [`Unsupported file type: ${mimeType}`],
      };
    }
  }

  /**
   * Parse VAT document to extract VAT Number, Company Name, and Registration Number
   */
  parseVatDocument(rawText: string): ExtractedDocumentData {
    const errors: string[] = [];
    const result: Partial<ExtractedDocumentData> = {
      success: false,
      rawText,
      confidence: 'medium',
      ocrMethod: 'pdf-parse',
      errors,
    };

    // Extract VAT Number
    const vatMatches = rawText.match(this.VAT_NUMBER_PATTERN);
    if (vatMatches && vatMatches.length > 0) {
      result.vatNumber = vatMatches[0];
      this.logger.log(`Extracted VAT Number: ${result.vatNumber}`);
    } else {
      errors.push('Could not find VAT number in document');
    }

    // Extract Registration Number
    const regMatches = rawText.match(this.REGISTRATION_NUMBER_PATTERN);
    if (regMatches && regMatches.length > 0) {
      result.registrationNumber = regMatches[0];
      this.logger.log(`Extracted Registration Number: ${result.registrationNumber}`);
    } else {
      errors.push('Could not find registration number in document');
    }

    // Extract Company Name (look for common patterns in SARS VAT documents)
    const companyName = this.extractCompanyNameFromText(rawText);
    if (companyName) {
      result.companyName = companyName;
      this.logger.log(`Extracted Company Name: ${result.companyName}`);
    } else {
      errors.push('Could not find company name in document');
    }

    // Success if at least one field was extracted
    result.success = !!(result.vatNumber || result.registrationNumber || result.companyName);

    // Adjust confidence based on how many fields we extracted
    const fieldsExtracted = [result.vatNumber, result.registrationNumber, result.companyName].filter(Boolean).length;
    if (fieldsExtracted === 3) {
      result.confidence = 'high';
    } else if (fieldsExtracted === 2) {
      result.confidence = 'medium';
    } else {
      result.confidence = 'low';
    }

    return result as ExtractedDocumentData;
  }

  /**
   * Parse Company Registration document to extract Registration Number and Company Name
   */
  parseRegistrationDocument(rawText: string): ExtractedDocumentData {
    const errors: string[] = [];
    const result: Partial<ExtractedDocumentData> = {
      success: false,
      rawText,
      confidence: 'medium',
      ocrMethod: 'pdf-parse',
      errors,
    };

    // Extract Registration Number
    const regMatches = rawText.match(this.REGISTRATION_NUMBER_PATTERN);
    if (regMatches && regMatches.length > 0) {
      result.registrationNumber = regMatches[0];
      this.logger.log(`Extracted Registration Number: ${result.registrationNumber}`);
    } else {
      errors.push('Could not find registration number in document');
    }

    // Extract Company Name
    const companyName = this.extractCompanyNameFromText(rawText);
    if (companyName) {
      result.companyName = companyName;
      this.logger.log(`Extracted Company Name: ${result.companyName}`);
    } else {
      errors.push('Could not find company name in document');
    }

    // Extract Address Information
    const addressInfo = this.extractAddressFromText(rawText);
    if (addressInfo.postalCode) {
      result.postalCode = addressInfo.postalCode;
      this.logger.log(`Extracted Postal Code: ${result.postalCode}`);
    }
    if (addressInfo.provinceState) {
      result.provinceState = addressInfo.provinceState;
      this.logger.log(`Extracted Province: ${result.provinceState}`);
    }
    if (addressInfo.city) {
      result.city = addressInfo.city;
      this.logger.log(`Extracted City: ${result.city}`);
    }
    if (addressInfo.streetAddress) {
      result.streetAddress = addressInfo.streetAddress;
      this.logger.log(`Extracted Street Address: ${result.streetAddress}`);
    }

    // Success if at least one field was extracted
    result.success = !!(result.registrationNumber || result.companyName);

    // Adjust confidence
    const fieldsExtracted = [
      result.registrationNumber,
      result.companyName,
      result.streetAddress,
      result.city,
      result.provinceState,
      result.postalCode
    ].filter(Boolean).length;
    if (fieldsExtracted >= 5) {
      result.confidence = 'high';
    } else if (fieldsExtracted >= 3) {
      result.confidence = 'medium';
    } else {
      result.confidence = 'low';
    }

    return result as ExtractedDocumentData;
  }

  /**
   * Extract company name from document text
   * Looks for common patterns in SA company documents
   */
  private extractCompanyNameFromText(text: string): string | null {
    // Remove extra whitespace and normalize
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    // Pattern 1: Look for lines with (PTY) LTD, LIMITED, (RF) NPC, etc.
    const companyPatterns = [
      /([A-Z][A-Z\s&'-]+)\s*\(PTY\)\s*LTD/i,
      /([A-Z][A-Z\s&'-]+)\s*\(PTY\)\s*LIMITED/i,
      /([A-Z][A-Z\s&'-]+)\s*LIMITED/i,
      /([A-Z][A-Z\s&'-]+)\s*\(RF\)\s*NPC/i,
      /([A-Z][A-Z\s&'-]+)\s*NPC/i,
      /([A-Z][A-Z\s&'-]+)\s*CC/i,
    ];

    for (const pattern of companyPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1] && match.index !== undefined) {
        const companyName = match[1].trim() + ' ' + normalizedText.substring(match.index + match[1].length, match.index + match[0].length).trim();
        return this.cleanCompanyName(companyName);
      }
    }

    // Pattern 2: Look for "Name:" or "Company Name:" label
    const labeledPatterns = [
      /(?:Company\s+Name|Name|Trading\s+Name)\s*:\s*([A-Z][A-Za-z\s&'\-()]+)/i,
    ];

    for (const pattern of labeledPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim().split(/\n/)[0];
        return this.cleanCompanyName(extracted);
      }
    }

    return null;
  }

  /**
   * Clean and normalize company name
   */
  private cleanCompanyName(name: string): string {
    return name
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  /**
   * Extract address information from document text
   */
  private extractAddressFromText(text: string): {
    streetAddress?: string;
    city?: string;
    provinceState?: string;
    postalCode?: string;
  } {
    const result: {
      streetAddress?: string;
      city?: string;
      provinceState?: string;
      postalCode?: string;
    } = {};

    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');

    // Extract Province
    for (const province of this.SA_PROVINCES) {
      if (normalizedText.includes(province)) {
        result.provinceState = province;
        this.logger.log(`Found province in text: ${province}`);
        break;
      }
    }

    // Extract Postal Code (4 digits, but try to avoid phone numbers and reg numbers)
    const postalMatches = text.match(/\b(\d{4})\b/g);
    if (postalMatches && postalMatches.length > 0) {
      // Take the last 4-digit match as it's usually the postal code
      const filtered = postalMatches.filter(code => {
        // Filter out years (1900-2099)
        const num = parseInt(code);
        return num < 1900 || num > 2099;
      });
      if (filtered.length > 0) {
        result.postalCode = filtered[filtered.length - 1];
      }
    }

    // Try to extract address lines - look for "Address:" or "Registered Address:" labels
    const addressPatterns = [
      /(?:Registered\s+Address|Physical\s+Address|Address|Business\s+Address)\s*:?\s*([^\n]+(?:\n[^\n]+){0,3})/i,
    ];

    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const addressBlock = match[1].trim();
        const lines = addressBlock.split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length > 0) {
          // First line is usually street address
          result.streetAddress = lines[0].toUpperCase();

          // Try to find city in the address lines
          if (lines.length > 1) {
            // City is usually on the second or third line
            const cityLine = lines[lines.length - 2] || lines[lines.length - 1];
            // Remove postal code and province from city line
            let cityCandidate = cityLine.toUpperCase();
            if (result.postalCode) {
              cityCandidate = cityCandidate.replace(result.postalCode, '').trim();
            }
            if (result.provinceState) {
              cityCandidate = cityCandidate.replace(result.provinceState, '').trim();
            }
            cityCandidate = cityCandidate.replace(/,/g, '').trim();
            if (cityCandidate) {
              result.city = cityCandidate;
            }
          }
        }
        break;
      }
    }

    return result;
  }

  /**
   * Validate extracted document data against expected user input
   */
  validateDocument(
    extractedData: ExtractedDocumentData,
    expectedData: {
      vatNumber?: string;
      registrationNumber?: string;
      companyName?: string;
      streetAddress?: string;
      city?: string;
      provinceState?: string;
      postalCode?: string;
    },
  ): ValidationResult {
    const mismatches: ValidationMismatch[] = [];

    this.logger.log('=== VALIDATION START ===');
    this.logger.log(`Expected Data: ${JSON.stringify(expectedData)}`);
    this.logger.log(`Extracted Data: ${JSON.stringify(extractedData)}`);

    if (!extractedData.success) {
      this.logger.warn('OCR extraction failed');
      return {
        isValid: false,
        mismatches: [],
        extractedData,
        requiresManualReview: true,
        ocrFailed: true,
      };
    }

    // Validate VAT Number (exact match, ignoring spaces)
    if (expectedData.vatNumber && extractedData.vatNumber) {
      const expectedVat = this.normalizeNumber(expectedData.vatNumber);
      const extractedVat = this.normalizeNumber(extractedData.vatNumber);

      this.logger.log(`VAT comparison: "${expectedVat}" vs "${extractedVat}"`);

      if (expectedVat !== extractedVat) {
        this.logger.warn(`VAT MISMATCH: ${expectedVat} !== ${extractedVat}`);
        mismatches.push({
          field: 'vatNumber',
          expected: expectedData.vatNumber,
          extracted: extractedData.vatNumber,
        });
      }
    }

    // Validate Registration Number (exact match, case-insensitive)
    if (expectedData.registrationNumber && extractedData.registrationNumber) {
      const expectedReg = this.normalizeNumber(expectedData.registrationNumber);
      const extractedReg = this.normalizeNumber(extractedData.registrationNumber);

      this.logger.log(`Registration comparison: "${expectedReg}" vs "${extractedReg}"`);

      if (expectedReg !== extractedReg) {
        this.logger.warn(`REGISTRATION MISMATCH: ${expectedReg} !== ${extractedReg}`);
        mismatches.push({
          field: 'registrationNumber',
          expected: expectedData.registrationNumber,
          extracted: extractedData.registrationNumber,
        });
      }
    }

    // Validate Company Name (fuzzy match)
    if (expectedData.companyName && extractedData.companyName) {
      const similarity = this.calculateNameSimilarity(
        expectedData.companyName,
        extractedData.companyName,
      );

      this.logger.log(
        `Company name similarity: ${similarity}% (${expectedData.companyName} vs ${extractedData.companyName})`,
      );

      // Threshold: >85% = match, <85% = mismatch
      if (similarity < 85) {
        this.logger.warn(`COMPANY NAME MISMATCH: ${similarity}% similarity`);
        mismatches.push({
          field: 'companyName',
          expected: expectedData.companyName,
          extracted: extractedData.companyName,
          similarity,
        });
      }
    }

    // Validate Street Address (fuzzy match)
    if (expectedData.streetAddress && extractedData.streetAddress) {
      const similarity = this.calculateNameSimilarity(
        expectedData.streetAddress,
        extractedData.streetAddress,
      );

      this.logger.log(
        `Street address similarity: ${similarity}% (${expectedData.streetAddress} vs ${extractedData.streetAddress})`,
      );

      // Threshold: >70% = match (more lenient for addresses due to formatting variations)
      if (similarity < 70) {
        this.logger.warn(`STREET ADDRESS MISMATCH: ${similarity}% similarity`);
        mismatches.push({
          field: 'streetAddress',
          expected: expectedData.streetAddress,
          extracted: extractedData.streetAddress,
          similarity,
        });
      }
    }

    // Validate City (fuzzy match)
    if (expectedData.city && extractedData.city) {
      const similarity = this.calculateNameSimilarity(
        expectedData.city,
        extractedData.city,
      );

      this.logger.log(
        `City similarity: ${similarity}% (${expectedData.city} vs ${extractedData.city})`,
      );

      if (similarity < 80) {
        this.logger.warn(`CITY MISMATCH: ${similarity}% similarity`);
        mismatches.push({
          field: 'city',
          expected: expectedData.city,
          extracted: extractedData.city,
          similarity,
        });
      }
    }

    // Validate Province (exact match after normalization)
    if (expectedData.provinceState && extractedData.provinceState) {
      const expectedProv = expectedData.provinceState.toUpperCase().trim();
      const extractedProv = extractedData.provinceState.toUpperCase().trim();

      this.logger.log(`Province comparison: "${expectedProv}" vs "${extractedProv}"`);

      if (expectedProv !== extractedProv) {
        this.logger.warn(`PROVINCE MISMATCH: ${expectedProv} !== ${extractedProv}`);
        mismatches.push({
          field: 'provinceState',
          expected: expectedData.provinceState,
          extracted: extractedData.provinceState,
        });
      }
    }

    // Validate Postal Code (exact match)
    if (expectedData.postalCode && extractedData.postalCode) {
      const expectedPostal = this.normalizeNumber(expectedData.postalCode);
      const extractedPostal = this.normalizeNumber(extractedData.postalCode);

      this.logger.log(`Postal code comparison: "${expectedPostal}" vs "${extractedPostal}"`);

      if (expectedPostal !== extractedPostal) {
        this.logger.warn(`POSTAL CODE MISMATCH: ${expectedPostal} !== ${extractedPostal}`);
        mismatches.push({
          field: 'postalCode',
          expected: expectedData.postalCode,
          extracted: extractedData.postalCode,
        });
      }
    }

    this.logger.log(`Total mismatches found: ${mismatches.length}`);
    this.logger.log(`Mismatches: ${JSON.stringify(mismatches)}`);
    this.logger.log('=== VALIDATION END ===');

    return {
      isValid: mismatches.length === 0,
      mismatches,
      extractedData,
      requiresManualReview: extractedData.confidence === 'low' && mismatches.length > 0,
      ocrFailed: false,
    };
  }

  /**
   * Normalize number string (remove spaces, hyphens, etc.)
   */
  private normalizeNumber(num: string): string {
    return num.replace(/[\s\-]/g, '').toUpperCase();
  }

  /**
   * Calculate similarity between two company names using fuzzy matching
   * Returns percentage similarity (0-100)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    // Normalize both names
    const normalized1 = this.normalizeCompanyName(name1);
    const normalized2 = this.normalizeCompanyName(name2);

    // Exact match after normalization
    if (normalized1 === normalized2) {
      return 100;
    }

    // Use Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    if (maxLength === 0) {
      return 100;
    }

    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.round(similarity);
  }

  /**
   * Normalize company name for comparison
   * - Convert to uppercase
   * - Remove punctuation
   * - Remove common suffixes
   * - Remove extra whitespace
   */
  private normalizeCompanyName(name: string): string {
    let normalized = name.toUpperCase();

    // Remove common suffixes
    const suffixes = [
      '\\(PTY\\)\\s*LTD',
      '\\(PTY\\)\\s*LIMITED',
      'LIMITED',
      '\\(RF\\)\\s*NPC',
      'NPC',
      'CC',
      'INC',
      'INCORPORATED',
      'CORP',
      'CORPORATION',
      'LTD',
    ];

    for (const suffix of suffixes) {
      const regex = new RegExp(`\\s*${suffix}\\s*$`, 'i');
      normalized = normalized.replace(regex, '');
    }

    // Remove punctuation and extra spaces
    normalized = normalized
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1,     // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
