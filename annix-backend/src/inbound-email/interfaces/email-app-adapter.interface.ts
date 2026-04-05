import { IDocumentClassifier } from "./document-classifier.interface";
import { IDocumentRouter } from "./document-router.interface";

export interface EmailAppAdapter extends IDocumentClassifier, IDocumentRouter {
  appName(): string;

  resolveCompanyId(fromEmail: string, configCompanyId: number | null): Promise<number | null>;
}

export const EMAIL_APP_ADAPTER = "EMAIL_APP_ADAPTER";
