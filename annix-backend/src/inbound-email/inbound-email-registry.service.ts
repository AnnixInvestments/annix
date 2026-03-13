import { Injectable, Logger } from "@nestjs/common";
import { IDocumentClassifier } from "./interfaces/document-classifier.interface";
import { IDocumentRouter } from "./interfaces/document-router.interface";

interface AppRegistration {
  classifier: IDocumentClassifier;
  router: IDocumentRouter;
}

@Injectable()
export class InboundEmailRegistry {
  private readonly logger = new Logger(InboundEmailRegistry.name);
  private readonly apps = new Map<string, AppRegistration>();

  registerApp(appName: string, classifier: IDocumentClassifier, router: IDocumentRouter): void {
    this.apps.set(appName, { classifier, router });
    this.logger.log(`Registered inbound email handler for app: ${appName}`);
  }

  classifierForApp(appName: string): IDocumentClassifier | null {
    return this.apps.get(appName)?.classifier ?? null;
  }

  routerForApp(appName: string): IDocumentRouter | null {
    return this.apps.get(appName)?.router ?? null;
  }

  registeredApps(): string[] {
    return Array.from(this.apps.keys());
  }

  isRegistered(appName: string): boolean {
    return this.apps.has(appName);
  }
}
