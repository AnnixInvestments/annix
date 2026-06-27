import { Inject, Injectable, Logger } from "@nestjs/common";
import { CompanyRepository } from "../platform/company.repository";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";

// Per-tenant company branding (letterhead banner + email signature) for use
// across that company's generated documents and outbound emails. Keyed by the
// tenant company id (resolved from the acting user). Returns null when the
// company has nothing configured so callers fall back to bundled defaults.
// Buffers are cached briefly per company to avoid a storage round-trip per
// document/email.
const CACHE_TTL_MS = 60_000;

interface BrandingEntry {
  at: number;
  letterhead: Buffer | null;
  signature: Buffer | null;
}

@Injectable()
export class CompanyBrandingService {
  private readonly logger = new Logger(CompanyBrandingService.name);
  private readonly cache = new Map<number, BrandingEntry>();

  constructor(
    private readonly companyRepo: CompanyRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
  ) {}

  private async load(companyId: number): Promise<BrandingEntry> {
    const cached = this.cache.get(companyId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached;
    }
    const company = await this.companyRepo.findById(companyId).catch(() => null);
    const download = async (key: string | null | undefined): Promise<Buffer | null> => {
      if (!key) return null;
      try {
        return await this.storage.download(key);
      } catch (err) {
        this.logger.warn(
          `Could not load branding asset "${key}" for company ${companyId}: ${err instanceof Error ? err.message : String(err)}`,
        );
        return null;
      }
    };
    const entry: BrandingEntry = {
      at: Date.now(),
      letterhead: await download(company?.letterheadPath),
      signature: await download(company?.emailSignaturePath),
    };
    this.cache.set(companyId, entry);
    return entry;
  }

  // The company's uploaded letterhead banner, or null to use the bundled default.
  async letterheadImage(companyId?: number | null): Promise<Buffer | null> {
    if (companyId == null) return null;
    return (await this.load(companyId)).letterhead;
  }

  // The company's uploaded email-signature image, or null if none configured.
  async emailSignatureImage(companyId?: number | null): Promise<Buffer | null> {
    if (companyId == null) return null;
    return (await this.load(companyId)).signature;
  }

  private pathField(kind: CompanyBrandingKind): "letterheadPath" | "emailSignaturePath" {
    return kind === "letterhead" ? "letterheadPath" : "emailSignaturePath";
  }

  // Store an uploaded branding image against the company and refresh its cache.
  async uploadAsset(
    companyId: number,
    kind: CompanyBrandingKind,
    file: Express.Multer.File,
  ): Promise<void> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new Error("Company not found");
    }
    const result = await this.storage.upload(file, `platform/companies/${companyId}/branding`);
    await this.companyRepo.save({ ...company, [this.pathField(kind)]: result.path });
    this.invalidate(companyId);
    this.logger.log(`Company ${companyId} ${kind} uploaded → ${result.path}`);
  }

  async removeAsset(companyId: number, kind: CompanyBrandingKind): Promise<void> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new Error("Company not found");
    }
    await this.companyRepo.save({ ...company, [this.pathField(kind)]: null });
    this.invalidate(companyId);
  }

  // Presigned URLs for previewing this company's branding in the settings UI.
  async assetUrls(
    companyId: number,
  ): Promise<{ letterheadUrl: string | null; emailSignatureUrl: string | null }> {
    const company = await this.companyRepo.findById(companyId).catch(() => null);
    const sign = async (key: string | null | undefined): Promise<string | null> => {
      if (!key) return null;
      try {
        return await this.storage.presignedUrl(key, 3600);
      } catch {
        return null;
      }
    };
    return {
      letterheadUrl: await sign(company?.letterheadPath),
      emailSignatureUrl: await sign(company?.emailSignaturePath),
    };
  }

  // Drop a company's cache so a freshly uploaded asset is picked up immediately.
  invalidate(companyId: number): void {
    this.cache.delete(companyId);
  }
}

export type CompanyBrandingKind = "letterhead" | "emailSignature";
