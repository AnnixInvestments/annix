import { Injectable } from "@nestjs/common";
import { FathomProvider } from "./fathom.provider";
import type { MeetingProvider, MeetingProviderName } from "./meeting-provider.interface";

// Central lookup for meeting-import providers. Today it holds Fathom; adding
// Zoom / Teams / Google Meet later is just registering another MeetingProvider
// here — the service, controller and UI resolve providers only through this
// registry, so nothing else needs to change.
@Injectable()
export class MeetingProviderRegistry {
  private readonly providers: Map<MeetingProviderName, MeetingProvider>;

  constructor(private readonly fathom: FathomProvider) {
    this.providers = new Map<MeetingProviderName, MeetingProvider>([[fathom.name, fathom]]);
  }

  get(name: MeetingProviderName): MeetingProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Unknown meeting provider: ${name}`);
    }
    return provider;
  }

  // Providers that are both registered and configured (have credentials).
  configured(): MeetingProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isConfigured());
  }

  all(): MeetingProvider[] {
    return Array.from(this.providers.values());
  }
}
