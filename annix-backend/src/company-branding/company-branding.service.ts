import { Inject, Injectable, Logger } from "@nestjs/common";
import { CompanyProfileRepository } from "../admin/repositories/company-profile.repository";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";

// Central access to the admin-configured company branding (letterhead banner +
// email signature) for use across generated documents and outbound emails.
// Returns null when nothing is configured so callers fall back to bundled
// defaults. Buffers are cached briefly to avoid a storage round-trip per
// document/email.
const CACHE_TTL_MS = 60_000;

interface BrandingCache {
  at: number;
  letterhead: Buffer | null;
  signature: Buffer | null;
}

@Injectable()
export class CompanyBrandingService {
  private readonly logger = new Logger(CompanyBrandingService.name);
  private cache: BrandingCache | null = null;

  constructor(
    private readonly profileRepo: CompanyProfileRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
  ) {}

  private async load(): Promise<BrandingCache> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache;
    }
    const profile = await this.profileRepo.findSingleton().catch(() => null);
    const download = async (key: string | null | undefined): Promise<Buffer | null> => {
      if (!key) return null;
      try {
        return await this.storage.download(key);
      } catch (err) {
        this.logger.warn(
          `Could not load branding asset "${key}": ${err instanceof Error ? err.message : String(err)}`,
        );
        return null;
      }
    };
    this.cache = {
      at: Date.now(),
      letterhead: await download(profile?.letterheadPath),
      signature: await download(profile?.emailSignaturePath),
    };
    return this.cache;
  }

  // The uploaded letterhead banner image, or null to use the bundled default.
  async letterheadImage(): Promise<Buffer | null> {
    return (await this.load()).letterhead;
  }

  // The uploaded email-signature image, or null if none configured.
  async emailSignatureImage(): Promise<Buffer | null> {
    return (await this.load()).signature;
  }

  // Drop the cache so a freshly uploaded asset is picked up immediately.
  invalidate(): void {
    this.cache = null;
  }
}
