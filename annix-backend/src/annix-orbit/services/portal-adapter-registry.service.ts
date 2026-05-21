import { Injectable, Logger } from "@nestjs/common";
import { PortalAdapter } from "./portal-adapter.interface";

@Injectable()
export class PortalAdapterRegistry {
  private readonly logger = new Logger(PortalAdapterRegistry.name);
  private readonly adapters = new Map<string, PortalAdapter>();

  register(adapter: PortalAdapter): void {
    if (this.adapters.has(adapter.portalCode)) {
      this.logger.warn(
        `Portal adapter "${adapter.portalCode}" already registered; overwriting previous registration.`,
      );
    }
    this.adapters.set(adapter.portalCode, adapter);
    this.logger.log(
      `Registered portal adapter: ${adapter.portalCode} (${adapter.displayName}, ${adapter.costTier})`,
    );
  }

  all(): PortalAdapter[] {
    return Array.from(this.adapters.values());
  }

  byCode(code: string): PortalAdapter | null {
    return this.adapters.get(code) ?? null;
  }

  freeAdapters(): PortalAdapter[] {
    return this.all().filter((adapter) => adapter.costTier === "free");
  }
}
