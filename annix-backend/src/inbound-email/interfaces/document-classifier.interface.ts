export interface ClassificationResult {
  documentType: string;
  confidence: number;
  source: "subject" | "content_ai" | "filename" | "manual";
  supplierName?: string | null;
}

export interface IDocumentClassifier {
  classifyFromSubject(subject: string, filename: string): ClassificationResult | null;
  classifyFromContent(
    content: string | Buffer,
    mimeType: string,
    filename: string,
    fromEmail: string,
    subject: string,
  ): Promise<ClassificationResult>;
}

export const DOCUMENT_CLASSIFIER = "DOCUMENT_CLASSIFIER";
