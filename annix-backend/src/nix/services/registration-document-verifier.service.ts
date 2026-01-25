import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import { AiExtractionService } from '../ai-providers/ai-extraction.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule;

export type RegistrationDocumentType = 'vat' | 'registration' | 'bee';

export interface ExpectedCompanyData {
  vatNumber?: string;
  registrationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  beeLevel?: number;
}

export interface ExtractedRegistrationData {
  vatNumber?: string;
  registrationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  beeLevel?: number;
  beeExpiryDate?: string;
  verificationAgency?: string;
  rawText?: string;
  confidence: number;
  fieldsExtracted: string[];
}

export interface FieldVerificationResult {
  field: string;
  expected: string | number | null;
  extracted: string | number | null;
  match: boolean;
  similarity?: number;
  autoCorrectValue?: string | number;
}

export interface RegistrationVerificationResult {
  success: boolean;
  documentType: RegistrationDocumentType;
  extractedData: ExtractedRegistrationData;
  fieldResults: FieldVerificationResult[];
  overallConfidence: number;
  allFieldsMatch: boolean;
  autoCorrections: Array<{ field: string; value: string | number }>;
  warnings: string[];
  ocrMethod: 'pdf-parse' | 'tesseract' | 'ai' | 'none';
  processingTimeMs: number;
}

const AI_REGISTRATION_PROMPT = `You are analyzing a South African business registration document. Extract the following information if present:

For VAT Registration Certificate:
- VAT Number (10 digits starting with 4)
- Company Registration Number (format: yyyy/nnnnnn/nn)
- Company Legal Name

For CIPC Company Registration:
- Company Registration Number (format: yyyy/nnnnnn/nn)
- Company Legal Name
- Registered Address (street, city, province, postal code)

For B-BBEE Certificate:
- BEE Level (1-8)
- Certificate Expiry Date
- Verification Agency Name
- Company Name

Return ONLY a JSON object with these fields (use null for missing values):
{
  "vatNumber": "string or null",
  "registrationNumber": "string or null",
  "companyName": "string or null",
  "streetAddress": "string or null",
  "city": "string or null",
  "provinceState": "string or null",
  "postalCode": "string or null",
  "beeLevel": "number or null",
  "beeExpiryDate": "string or null (ISO date)",
  "verificationAgency": "string or null"
}`;

@Injectable()
export class RegistrationDocumentVerifierService {
  private readonly logger = new Logger(
    RegistrationDocumentVerifierService.name,
  );

  private readonly VAT_NUMBER_PATTERN = /\b4\d{9}\b/g;
  private readonly REGISTRATION_NUMBER_PATTERN = /\b\d{4}\/\d{6}\/\d{2}\b/g;
  private readonly POSTAL_CODE_PATTERN = /\b\d{4}\b/g;
  private readonly BEE_LEVEL_PATTERN = /(?:level|lvl)\s*[:\s]?\s*([1-8])/i;

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

  constructor(private readonly aiExtractor: AiExtractionService) {}

  async verifyDocument(
    file: Express.Multer.File,
    documentType: RegistrationDocumentType,
    expectedData: ExpectedCompanyData,
  ): Promise<RegistrationVerificationResult> {
    const startTime = Date.now();
    this.logger.log(`Verifying ${documentType} document: ${file.originalname}`);

    try {
      const extractedData = await this.extractDocumentData(file, documentType);
      const fieldResults = this.compareFields(
        documentType,
        extractedData,
        expectedData,
      );
      const autoCorrections = this.determineAutoCorrections(
        fieldResults,
        extractedData,
      );
      const allFieldsMatch = fieldResults.every((f) => f.match);
      const overallConfidence = this.calculateOverallConfidence(
        extractedData,
        fieldResults,
      );

      const warnings: string[] = [];
      if (extractedData.confidence < 0.5) {
        warnings.push('Low OCR confidence - document may be difficult to read');
      }
      if (!allFieldsMatch && overallConfidence > 0.7) {
        warnings.push(
          'Some fields differ from provided data - extracted values may be more accurate',
        );
      }

      return {
        success: true,
        documentType,
        extractedData,
        fieldResults,
        overallConfidence,
        allFieldsMatch,
        autoCorrections,
        warnings,
        ocrMethod: extractedData.rawText ? 'pdf-parse' : 'none',
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Document verification failed: ${error.message}`);
      return {
        success: false,
        documentType,
        extractedData: { confidence: 0, fieldsExtracted: [] },
        fieldResults: [],
        overallConfidence: 0,
        allFieldsMatch: false,
        autoCorrections: [],
        warnings: [error.message],
        ocrMethod: 'none',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  async verifyBatch(
    files: Array<{
      file: Express.Multer.File;
      documentType: RegistrationDocumentType;
    }>,
    expectedData: ExpectedCompanyData,
  ): Promise<RegistrationVerificationResult[]> {
    const results = await Promise.all(
      files.map(({ file, documentType }) =>
        this.verifyDocument(file, documentType, expectedData),
      ),
    );
    return results;
  }

  private async extractDocumentData(
    file: Express.Multer.File,
    documentType: RegistrationDocumentType,
  ): Promise<ExtractedRegistrationData> {
    const mimeType = file.mimetype;
    let rawText = '';
    let ocrConfidence = 0.8;

    if (mimeType === 'application/pdf') {
      const pdfResult = await this.extractFromPdf(file.buffer);
      rawText = pdfResult.text;
      ocrConfidence = pdfResult.confidence;
    } else if (mimeType.startsWith('image/')) {
      const imageResult = await this.extractFromImage(file.buffer);
      rawText = imageResult.text;
      ocrConfidence = imageResult.confidence;
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (!rawText || rawText.trim().length < 10) {
      return {
        confidence: 0,
        fieldsExtracted: [],
        rawText,
      };
    }

    const availableProviders = await this.aiExtractor.getAvailableProviders();
    if (availableProviders.length > 0) {
      try {
        const aiExtracted = await this.extractWithAi(rawText, documentType);
        if (aiExtracted) {
          return {
            ...aiExtracted,
            rawText,
            confidence: Math.max(ocrConfidence, aiExtracted.confidence),
          };
        }
      } catch (error) {
        this.logger.warn(
          `AI extraction failed, falling back to pattern matching: ${error.message}`,
        );
      }
    }

    return this.extractWithPatterns(rawText, documentType, ocrConfidence);
  }

  private async extractFromPdf(
    buffer: Buffer,
  ): Promise<{ text: string; confidence: number }> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text || '';
      const confidence = text.length > 100 ? 0.85 : 0.6;
      return { text, confidence };
    } catch (error) {
      this.logger.error(`PDF extraction failed: ${error.message}`);
      return { text: '', confidence: 0 };
    }
  }

  private async extractFromImage(
    buffer: Buffer,
  ): Promise<{ text: string; confidence: number }> {
    let worker;
    try {
      worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return {
        text: data.text || '',
        confidence: data.confidence / 100,
      };
    } catch (error) {
      if (worker) await worker.terminate();
      this.logger.error(`Image OCR failed: ${error.message}`);
      return { text: '', confidence: 0 };
    }
  }

  private async extractWithAi(
    text: string,
    documentType: RegistrationDocumentType,
  ): Promise<ExtractedRegistrationData | null> {
    try {
      const prompt = `${AI_REGISTRATION_PROMPT}\n\nDocument Type: ${documentType}\n\nDocument Text:\n${text.substring(0, 10000)}`;

      const response = await this.callAiForExtraction(prompt);
      if (!response) return null;

      const parsed = JSON.parse(response);
      const fieldsExtracted: string[] = [];

      if (parsed.vatNumber) fieldsExtracted.push('vatNumber');
      if (parsed.registrationNumber) fieldsExtracted.push('registrationNumber');
      if (parsed.companyName) fieldsExtracted.push('companyName');
      if (parsed.streetAddress) fieldsExtracted.push('streetAddress');
      if (parsed.city) fieldsExtracted.push('city');
      if (parsed.provinceState) fieldsExtracted.push('provinceState');
      if (parsed.postalCode) fieldsExtracted.push('postalCode');
      if (parsed.beeLevel) fieldsExtracted.push('beeLevel');
      if (parsed.beeExpiryDate) fieldsExtracted.push('beeExpiryDate');
      if (parsed.verificationAgency) fieldsExtracted.push('verificationAgency');

      return {
        vatNumber: parsed.vatNumber || undefined,
        registrationNumber: parsed.registrationNumber || undefined,
        companyName: parsed.companyName?.toUpperCase() || undefined,
        streetAddress: parsed.streetAddress?.toUpperCase() || undefined,
        city: parsed.city?.toUpperCase() || undefined,
        provinceState: parsed.provinceState?.toUpperCase() || undefined,
        postalCode: parsed.postalCode || undefined,
        beeLevel: parsed.beeLevel || undefined,
        beeExpiryDate: parsed.beeExpiryDate || undefined,
        verificationAgency: parsed.verificationAgency || undefined,
        confidence: 0.9,
        fieldsExtracted,
      };
    } catch (error) {
      this.logger.warn(`AI extraction parsing failed: ${error.message}`);
      return null;
    }
  }

  private async callAiForExtraction(prompt: string): Promise<string | null> {
    const availableProviders = await this.aiExtractor.getAvailableProviders();
    if (availableProviders.length === 0) return null;

    const provider = availableProviders.includes('gemini')
      ? 'gemini'
      : 'claude';

    try {
      if (provider === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return null;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
              },
            }),
          },
        );

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      } else {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return null;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 2048,
            temperature: 0.1,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const data = await response.json();
        return data.content?.[0]?.text || null;
      }
    } catch (error) {
      this.logger.error(`AI API call failed: ${error.message}`);
      return null;
    }
  }

  private extractWithPatterns(
    rawText: string,
    documentType: RegistrationDocumentType,
    ocrConfidence: number,
  ): ExtractedRegistrationData {
    const fieldsExtracted: string[] = [];
    const result: Partial<ExtractedRegistrationData> = {
      confidence: ocrConfidence,
      rawText,
    };

    if (documentType === 'vat' || documentType === 'registration') {
      const vatMatches = rawText.match(this.VAT_NUMBER_PATTERN);
      if (vatMatches?.[0]) {
        result.vatNumber = vatMatches[0];
        fieldsExtracted.push('vatNumber');
      }

      const regMatches = rawText.match(this.REGISTRATION_NUMBER_PATTERN);
      if (regMatches?.[0]) {
        result.registrationNumber = regMatches[0];
        fieldsExtracted.push('registrationNumber');
      }

      const companyName = this.extractCompanyName(rawText);
      if (companyName) {
        result.companyName = companyName;
        fieldsExtracted.push('companyName');
      }

      if (documentType === 'registration') {
        const addressInfo = this.extractAddress(rawText);
        if (addressInfo.streetAddress) {
          result.streetAddress = addressInfo.streetAddress;
          fieldsExtracted.push('streetAddress');
        }
        if (addressInfo.city) {
          result.city = addressInfo.city;
          fieldsExtracted.push('city');
        }
        if (addressInfo.provinceState) {
          result.provinceState = addressInfo.provinceState;
          fieldsExtracted.push('provinceState');
        }
        if (addressInfo.postalCode) {
          result.postalCode = addressInfo.postalCode;
          fieldsExtracted.push('postalCode');
        }
      }
    }

    if (documentType === 'bee') {
      const beeMatch = rawText.match(this.BEE_LEVEL_PATTERN);
      if (beeMatch?.[1]) {
        result.beeLevel = parseInt(beeMatch[1], 10);
        fieldsExtracted.push('beeLevel');
      }

      const companyName = this.extractCompanyName(rawText);
      if (companyName) {
        result.companyName = companyName;
        fieldsExtracted.push('companyName');
      }

      const expiryMatch = rawText.match(
        /(?:expir|valid.*until|valid.*to)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      );
      if (expiryMatch?.[1]) {
        result.beeExpiryDate = expiryMatch[1];
        fieldsExtracted.push('beeExpiryDate');
      }

      const agencyPatterns = [
        /verified\s+by[:\s]*([A-Za-z\s]+)/i,
        /verification\s+agency[:\s]*([A-Za-z\s]+)/i,
        /issuing\s+body[:\s]*([A-Za-z\s]+)/i,
      ];
      for (const pattern of agencyPatterns) {
        const match = rawText.match(pattern);
        if (match?.[1]) {
          result.verificationAgency = match[1].trim();
          fieldsExtracted.push('verificationAgency');
          break;
        }
      }
    }

    return {
      ...result,
      fieldsExtracted,
    } as ExtractedRegistrationData;
  }

  private extractCompanyName(text: string): string | null {
    const normalizedText = text.replace(/\s+/g, ' ').trim();

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
      if (match?.[1] && match.index !== undefined) {
        const fullMatch = normalizedText.substring(
          match.index,
          match.index + match[0].length,
        );
        return fullMatch.toUpperCase().replace(/\s+/g, ' ').trim();
      }
    }

    const labeledPatterns = [
      /(?:Company\s+Name|Name|Trading\s+Name)\s*:\s*([A-Z][A-Za-z\s&'\-()]+)/i,
    ];

    for (const pattern of labeledPatterns) {
      const match = normalizedText.match(pattern);
      if (match?.[1]) {
        return match[1].trim().toUpperCase().split(/\n/)[0];
      }
    }

    return null;
  }

  private extractAddress(text: string): Partial<ExtractedRegistrationData> {
    const result: Partial<ExtractedRegistrationData> = {};
    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');

    for (const province of this.SA_PROVINCES) {
      if (normalizedText.includes(province)) {
        result.provinceState = province;
        break;
      }
    }

    const postalMatches = text.match(/\b(\d{4})\b/g);
    if (postalMatches?.length) {
      const filtered = postalMatches.filter((code) => {
        const num = parseInt(code);
        return num < 1900 || num > 2099;
      });
      if (filtered.length) {
        result.postalCode = filtered[filtered.length - 1];
      }
    }

    const addressPatterns = [
      /(?:Registered\s+Address|Physical\s+Address|Address|Business\s+Address)\s*:?\s*([^\n]+(?:\n[^\n]+){0,3})/i,
    ];

    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const lines = match[1]
          .trim()
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l);
        if (lines.length) {
          result.streetAddress = lines[0].toUpperCase();
          if (lines.length > 1) {
            let cityLine = lines[lines.length - 2] || lines[lines.length - 1];
            cityLine = cityLine.toUpperCase();
            if (result.postalCode)
              cityLine = cityLine.replace(result.postalCode, '').trim();
            if (result.provinceState)
              cityLine = cityLine.replace(result.provinceState, '').trim();
            cityLine = cityLine.replace(/,/g, '').trim();
            if (cityLine) result.city = cityLine;
          }
        }
        break;
      }
    }

    return result;
  }

  private compareFields(
    documentType: RegistrationDocumentType,
    extracted: ExtractedRegistrationData,
    expected: ExpectedCompanyData,
  ): FieldVerificationResult[] {
    const results: FieldVerificationResult[] = [];

    if (documentType === 'vat') {
      if (expected.vatNumber) {
        results.push(
          this.compareField(
            'vatNumber',
            expected.vatNumber,
            extracted.vatNumber,
            'exact',
          ),
        );
      }
      if (expected.registrationNumber) {
        results.push(
          this.compareField(
            'registrationNumber',
            expected.registrationNumber,
            extracted.registrationNumber,
            'exact',
          ),
        );
      }
      if (expected.companyName) {
        results.push(
          this.compareField(
            'companyName',
            expected.companyName,
            extracted.companyName,
            'fuzzy',
          ),
        );
      }
    }

    if (documentType === 'registration') {
      if (expected.registrationNumber) {
        results.push(
          this.compareField(
            'registrationNumber',
            expected.registrationNumber,
            extracted.registrationNumber,
            'exact',
          ),
        );
      }
      if (expected.companyName) {
        results.push(
          this.compareField(
            'companyName',
            expected.companyName,
            extracted.companyName,
            'fuzzy',
          ),
        );
      }
      if (expected.streetAddress) {
        results.push(
          this.compareField(
            'streetAddress',
            expected.streetAddress,
            extracted.streetAddress,
            'fuzzy',
            70,
          ),
        );
      }
      if (expected.city) {
        results.push(
          this.compareField('city', expected.city, extracted.city, 'fuzzy', 80),
        );
      }
      if (expected.provinceState) {
        results.push(
          this.compareField(
            'provinceState',
            expected.provinceState,
            extracted.provinceState,
            'exact',
          ),
        );
      }
      if (expected.postalCode) {
        results.push(
          this.compareField(
            'postalCode',
            expected.postalCode,
            extracted.postalCode,
            'exact',
          ),
        );
      }
    }

    if (documentType === 'bee') {
      if (expected.beeLevel !== undefined) {
        results.push(
          this.compareField(
            'beeLevel',
            expected.beeLevel,
            extracted.beeLevel,
            'exact',
          ),
        );
      }
      if (expected.companyName) {
        results.push(
          this.compareField(
            'companyName',
            expected.companyName,
            extracted.companyName,
            'fuzzy',
          ),
        );
      }
    }

    return results;
  }

  private compareField(
    field: string,
    expected: string | number | undefined,
    extracted: string | number | undefined,
    matchType: 'exact' | 'fuzzy',
    threshold = 85,
  ): FieldVerificationResult {
    if (!expected) {
      return {
        field,
        expected: null,
        extracted: extracted ?? null,
        match: true,
        autoCorrectValue: extracted,
      };
    }

    if (!extracted) {
      return {
        field,
        expected,
        extracted: null,
        match: false,
      };
    }

    if (matchType === 'exact') {
      const normalizedExpected = this.normalizeValue(String(expected));
      const normalizedExtracted = this.normalizeValue(String(extracted));
      const match = normalizedExpected === normalizedExtracted;

      return {
        field,
        expected,
        extracted,
        match,
        autoCorrectValue: match ? undefined : extracted,
      };
    }

    const similarity = this.calculateSimilarity(
      String(expected),
      String(extracted),
    );
    const match = similarity >= threshold;

    return {
      field,
      expected,
      extracted,
      match,
      similarity,
      autoCorrectValue: !match && similarity > 50 ? extracted : undefined,
    };
  }

  private normalizeValue(value: string): string {
    return value.replace(/[\s\-]/g, '').toUpperCase();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const normalized1 = this.normalizeCompanyName(str1);
    const normalized2 = this.normalizeCompanyName(str2);

    if (normalized1 === normalized2) return 100;

    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    if (maxLength === 0) return 100;

    return Math.round(((maxLength - distance) / maxLength) * 100);
  }

  private normalizeCompanyName(name: string): string {
    let normalized = name.toUpperCase();

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
      normalized = normalized.replace(
        new RegExp(`\\s*${suffix}\\s*$`, 'i'),
        '',
      );
    }

    return normalized
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private determineAutoCorrections(
    fieldResults: FieldVerificationResult[],
    extracted: ExtractedRegistrationData,
  ): Array<{ field: string; value: string | number }> {
    const corrections: Array<{ field: string; value: string | number }> = [];
    const addedFields = new Set<string>();

    for (const result of fieldResults) {
      if (result.autoCorrectValue !== undefined) {
        corrections.push({
          field: result.field,
          value: result.autoCorrectValue,
        });
        addedFields.add(result.field);
      }
    }

    const extractableFields: Array<keyof ExtractedRegistrationData> = [
      'vatNumber',
      'registrationNumber',
      'companyName',
      'streetAddress',
      'city',
      'provinceState',
      'postalCode',
      'beeLevel',
      'beeExpiryDate',
      'verificationAgency',
    ];

    for (const field of extractableFields) {
      if (addedFields.has(field)) continue;
      const value = extracted[field];
      if (value !== undefined && value !== null) {
        corrections.push({ field, value: value as string | number });
        addedFields.add(field);
      }
    }

    return corrections;
  }

  private calculateOverallConfidence(
    extracted: ExtractedRegistrationData,
    fieldResults: FieldVerificationResult[],
  ): number {
    if (fieldResults.length === 0) return extracted.confidence;

    const matchedCount = fieldResults.filter((r) => r.match).length;
    const matchRatio = matchedCount / fieldResults.length;

    const avgSimilarity =
      fieldResults
        .filter((r) => r.similarity !== undefined)
        .reduce((sum, r) => sum + (r.similarity || 0), 0) /
      (fieldResults.filter((r) => r.similarity !== undefined).length || 1);

    return (
      Math.round(
        (extracted.confidence * 0.3 +
          matchRatio * 0.5 +
          (avgSimilarity / 100) * 0.2) *
          100,
      ) / 100
    );
  }

  generateMismatchReport(result: RegistrationVerificationResult): string {
    const mismatches = result.fieldResults.filter((r) => !r.match);

    if (mismatches.length === 0) {
      return 'All fields verified successfully.';
    }

    const lines = [
      'Document verification found the following discrepancies:',
      '',
    ];

    for (const mismatch of mismatches) {
      const similarity =
        mismatch.similarity !== undefined
          ? ` (${mismatch.similarity}% similar)`
          : '';
      lines.push(`• ${mismatch.field}:`);
      lines.push(`  - You entered: ${mismatch.expected}`);
      lines.push(
        `  - Document shows: ${mismatch.extracted || 'Not found'}${similarity}`,
      );
      lines.push('');
    }

    if (result.autoCorrections.length > 0) {
      lines.push('Suggested corrections:');
      for (const correction of result.autoCorrections) {
        lines.push(`• ${correction.field}: ${correction.value}`);
      }
    }

    return lines.join('\n');
  }
}
