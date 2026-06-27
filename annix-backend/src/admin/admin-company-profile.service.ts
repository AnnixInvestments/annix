import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";
import { CompanyProfile } from "./entities/company-profile.entity";
import { CompanyProfileRepository } from "./repositories/company-profile.repository";

export type CompanyAssetKind = "letterhead" | "emailSignature";

@Injectable()
export class AdminCompanyProfileService {
  private readonly logger = new Logger(AdminCompanyProfileService.name);

  constructor(
    private readonly companyProfileRepo: CompanyProfileRepository,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  private pathField(kind: CompanyAssetKind): "letterheadPath" | "emailSignaturePath" {
    return kind === "letterhead" ? "letterheadPath" : "emailSignaturePath";
  }

  // Store an uploaded branding image (letterhead banner or email signature) and
  // record its storage key on the profile.
  async uploadAsset(kind: CompanyAssetKind, file: Express.Multer.File): Promise<CompanyProfile> {
    const profile = await this.profile();
    const result = await this.storageService.upload(file, "admin/company-profile");
    const field = this.pathField(kind);
    const saved = await this.companyProfileRepo.save({ ...profile, [field]: result.path });
    this.logger.log(`Company ${kind} uploaded → ${result.path}`);
    return saved;
  }

  async removeAsset(kind: CompanyAssetKind): Promise<CompanyProfile> {
    const profile = await this.profile();
    const field = this.pathField(kind);
    return this.companyProfileRepo.save({ ...profile, [field]: null });
  }

  // Presigned URLs for previewing the current branding assets in the admin UI.
  async assetUrls(): Promise<{ letterheadUrl: string | null; emailSignatureUrl: string | null }> {
    const profile = await this.profile();
    const sign = async (key: string | null): Promise<string | null> => {
      if (!key) return null;
      try {
        return await this.storageService.presignedUrl(key, 3600);
      } catch {
        return null;
      }
    };
    return {
      letterheadUrl: await sign(profile.letterheadPath ?? null),
      emailSignatureUrl: await sign(profile.emailSignaturePath ?? null),
    };
  }

  async profile(): Promise<CompanyProfile> {
    const row = await this.companyProfileRepo.findSingleton();
    if (!row) {
      throw new NotFoundException("Company profile not found. Run migrations to seed it.");
    }
    return row;
  }

  async updateProfile(dto: UpdateCompanyProfileDto): Promise<CompanyProfile> {
    const existing = await this.profile();
    const defined = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const merged: CompanyProfile = { ...existing, ...defined };
    const saved = await this.companyProfileRepo.save(merged);
    this.logger.log("Company profile updated");
    return saved;
  }
}
