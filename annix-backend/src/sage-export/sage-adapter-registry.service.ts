import { Injectable, Logger } from "@nestjs/common";
import type { SageInvoiceAdapter } from "./interfaces/sage-invoice-adapter.interface";

export interface SageAdapterRegistration {
  moduleCode: string;
  adapterKey: string;
  label: string;
  adapter: SageInvoiceAdapter;
}

@Injectable()
export class SageAdapterRegistry {
  private readonly logger = new Logger(SageAdapterRegistry.name);
  private readonly adapters = new Map<string, SageAdapterRegistration>();

  registerAdapter(registration: SageAdapterRegistration): void {
    const compositeKey = `${registration.moduleCode}:${registration.adapterKey}`;
    this.adapters.set(compositeKey, registration);
    this.logger.log(`Registered Sage adapter: ${compositeKey} (${registration.label})`);
  }

  adapterByKey(moduleCode: string, adapterKey: string): SageInvoiceAdapter | null {
    return this.adapters.get(`${moduleCode}:${adapterKey}`)?.adapter ?? null;
  }

  adaptersForModule(moduleCode: string): SageAdapterRegistration[] {
    return Array.from(this.adapters.values()).filter((reg) => reg.moduleCode === moduleCode);
  }

  allAdapters(): SageAdapterRegistration[] {
    return Array.from(this.adapters.values());
  }

  registeredModules(): string[] {
    const modules = new Set(Array.from(this.adapters.values()).map((reg) => reg.moduleCode));
    return Array.from(modules);
  }

  isRegistered(moduleCode: string, adapterKey: string): boolean {
    return this.adapters.has(`${moduleCode}:${adapterKey}`);
  }
}
