import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppBrandingRepository } from "./app-branding.repository";
import { AppBranding } from "./entities/app-branding.entity";
import { AppBrandingImage } from "./entities/app-branding-image.entity";

@Injectable()
export class PostgresAppBrandingRepository implements AppBrandingRepository {
  constructor(
    @InjectRepository(AppBranding)
    private readonly repository: Repository<AppBranding>,
    @InjectRepository(AppBrandingImage)
    private readonly imageRepository: Repository<AppBrandingImage>,
  ) {}

  findByBrandCode(brandCode: string): Promise<AppBranding | null> {
    return this.repository.findOne({ where: { brandCode } });
  }

  save(branding: AppBranding): Promise<AppBranding> {
    return this.repository.save(branding);
  }

  listImages(brandCode: string): Promise<AppBrandingImage[]> {
    return this.imageRepository.find({
      where: { brandCode },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
  }

  findImage(brandCode: string, id: string): Promise<AppBrandingImage | null> {
    return this.imageRepository.findOne({ where: { id, brandCode } });
  }

  async nextImageSortOrder(brandCode: string): Promise<number> {
    const maxRow = await this.imageRepository.findOne({
      where: { brandCode },
      order: { sortOrder: "DESC" },
    });
    return maxRow ? maxRow.sortOrder + 1 : 0;
  }

  saveImage(image: AppBrandingImage): Promise<AppBrandingImage> {
    return this.imageRepository.save(this.imageRepository.create(image));
  }

  async deleteImage(id: string): Promise<void> {
    await this.imageRepository.delete({ id });
  }
}
