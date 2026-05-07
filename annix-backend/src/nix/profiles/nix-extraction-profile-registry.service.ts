import { Injectable, Logger } from "@nestjs/common";
import type { IExtractionProfileHandler } from "./extraction-profile-handler.interface";

@Injectable()
export class NixExtractionProfileRegistry {
  private readonly logger = new Logger(NixExtractionProfileRegistry.name);
  private readonly handlers = new Map<string, IExtractionProfileHandler>();

  register(handler: IExtractionProfileHandler): void {
    if (this.handlers.has(handler.profileKey)) {
      this.logger.warn(
        `Nix extraction profile "${handler.profileKey}" is being re-registered (replacing previous handler).`,
      );
    }
    this.handlers.set(handler.profileKey, handler);
    this.logger.log(
      `Registered Nix extraction profile: ${handler.profileKey} (module=${handler.sourceModule}, label="${handler.label}")`,
    );
  }

  handler(profileKey: string): IExtractionProfileHandler | null {
    return this.handlers.get(profileKey) ?? null;
  }

  isRegistered(profileKey: string): boolean {
    return this.handlers.has(profileKey);
  }

  registeredProfiles(): IExtractionProfileHandler[] {
    return Array.from(this.handlers.values());
  }

  profilesForModule(sourceModule: string): IExtractionProfileHandler[] {
    return this.registeredProfiles().filter((h) => h.sourceModule === sourceModule);
  }
}
