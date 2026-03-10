import { Injectable, Logger } from "@nestjs/common";
import { pdfToPng } from "pdf-to-png-converter";
import { nowMillis } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import type {
  ChatMessage,
  ImageContent,
  TextContent,
} from "../../nix/ai-providers/claude-chat.provider";

export interface IdentifiedCertificate {
  supplierName: string | null;
  batchNumber: string | null;
  certificateType: "COA" | "COC" | null;
  productInfo: string | null;
  pageNumbers: number[];
  confidence: number;
}

export interface CertificateAnalysisResult {
  certificates: IdentifiedCertificate[];
  totalPages: number;
  processingTimeMs: number;
}

const CERTIFICATE_ANALYSIS_PROMPT = `You are an expert at analysing supplier certificates. You are viewing high-resolution images of pages from a multi-page document that may contain one or more individual COC (Certificate of Conformance) or COA (Certificate of Analysis) documents.

Your task is to identify and separate each distinct certificate document within the pages.

Each certificate may span 1 or more consecutive pages. Look for visual cues such as:
- Company letterheads or logos changing between pages
- New certificate numbers or document headers
- Different supplier/manufacturer names
- Distinct batch/lot numbers
- Page breaks with new document formatting

For each identified certificate, extract:
- "supplierName": The supplier or manufacturer name from the certificate header/letterhead
- "batchNumber": The batch number, lot number, heat number, or cast number
- "certificateType": Either "COA" (Certificate of Analysis - contains chemical/physical test results) or "COC" (Certificate of Conformance - confirms compliance to a standard)
- "productInfo": A brief description of the product or material covered (e.g. "316L Stainless Steel Plate 10mm", "Rubber Sheet 6mm NR/SBR")
- "pageNumbers": Array of 1-based page numbers this certificate spans
- "confidence": Your confidence in this identification (0.0 to 1.0)

Return valid JSON only in this format:
{
  "certificates": [
    {
      "supplierName": "Macsteel Service Centres",
      "batchNumber": "H12345",
      "certificateType": "COC",
      "productInfo": "Grade 350WA Structural Steel Plate 12mm",
      "pageNumbers": [1, 2],
      "confidence": 0.95
    },
    {
      "supplierName": "Trident Steel",
      "batchNumber": "B98765",
      "certificateType": "COA",
      "productInfo": "API 5L Grade B Pipe 200NB Sch40",
      "pageNumbers": [3],
      "confidence": 0.90
    }
  ]
}

Rules:
- Every page must be assigned to exactly one certificate
- If a page is ambiguous, assign it to the most likely certificate and lower the confidence
- If the entire document appears to be a single certificate, return a single entry
- Set confidence based on clarity of identification
- Return null for fields you cannot determine
- Return valid JSON only, no additional text`;

@Injectable()
export class CertificateAnalysisService {
  private readonly logger = new Logger(CertificateAnalysisService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  async analyze(fileBuffer: Buffer, mimeType: string): Promise<CertificateAnalysisResult> {
    const startMs = nowMillis();
    const images = await this.imagePagesFromFile(fileBuffer, mimeType);

    if (images.length === 0) {
      return { certificates: [], totalPages: 0, processingTimeMs: nowMillis() - startMs };
    }

    const contentParts: (TextContent | ImageContent)[] = images.map(
      (img, idx): TextContent | ImageContent => ({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: img.toString("base64"),
        },
      }),
    );

    contentParts.push({
      type: "text",
      text: `You are viewing ${images.length} page(s). Identify all distinct COC/COA certificate documents across these pages. Respond with JSON only.`,
    });

    const messages: ChatMessage[] = [{ role: "user", content: contentParts }];
    const { content: response } = await this.aiChatService.chat(
      messages,
      CERTIFICATE_ANALYSIS_PROMPT,
      "claude",
    );

    const certificates = this.parseResponse(response, images.length);
    const processingTimeMs = nowMillis() - startMs;

    this.logger.log(
      `Certificate analysis complete: ${certificates.length} certificate(s) identified across ${images.length} page(s) in ${processingTimeMs}ms`,
    );

    return {
      certificates,
      totalPages: images.length,
      processingTimeMs,
    };
  }

  private async imagePagesFromFile(fileBuffer: Buffer, mimeType: string): Promise<Buffer[]> {
    if (mimeType === "application/pdf") {
      return this.convertPdfToImages(fileBuffer);
    }

    if (mimeType.startsWith("image/")) {
      return [fileBuffer];
    }

    this.logger.warn(`Unsupported mime type for certificate analysis: ${mimeType}`);
    return [];
  }

  private async convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    this.logger.log("Converting PDF to images for certificate analysis...");
    const pdfInput = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );
    const pages = await pdfToPng(pdfInput, {
      disableFontFace: true,
      useSystemFonts: true,
      viewportScale: 1.5,
    });
    this.logger.log(`Converted PDF to ${pages.length} image(s)`);

    const allImages = pages
      .filter((page) => page.content !== undefined)
      .map((page) => page.content as Buffer);

    const totalBytes = allImages.reduce((sum, img) => sum + img.length, 0);
    this.logger.log(
      `Total image payload: ${(totalBytes / 1024 / 1024).toFixed(1)}MB across ${allImages.length} page(s)`,
    );

    if (allImages.length <= 20) {
      return allImages;
    }

    this.logger.warn(`PDF has ${allImages.length} pages, capping at 20 (first 10 + last 10)`);
    return [...allImages.slice(0, 10), ...allImages.slice(-10)];
  }

  private parseResponse(response: string, totalPages: number): IdentifiedCertificate[] {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.warn("AI response did not contain valid JSON for certificate analysis");
      return [];
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const rawCertificates = Array.isArray(parsed.certificates) ? parsed.certificates : [];

      return rawCertificates.map(
        (cert: any): IdentifiedCertificate => ({
          supplierName: cert.supplierName || null,
          batchNumber: cert.batchNumber || null,
          certificateType:
            cert.certificateType === "COA" || cert.certificateType === "COC"
              ? cert.certificateType
              : null,
          productInfo: cert.productInfo || null,
          pageNumbers: Array.isArray(cert.pageNumbers)
            ? cert.pageNumbers.filter(
                (n: any) => typeof n === "number" && n >= 1 && n <= totalPages,
              )
            : [],
          confidence: typeof cert.confidence === "number" ? cert.confidence : 0.5,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`Failed to parse certificate analysis response: ${message}`);
      return [];
    }
  }
}
