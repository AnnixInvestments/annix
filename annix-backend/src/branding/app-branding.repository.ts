import { AppBranding } from "./entities/app-branding.entity";
import { AppBrandingImage } from "./entities/app-branding-image.entity";

export abstract class AppBrandingRepository {
  abstract findByBrandCode(brandCode: string): Promise<AppBranding | null>;
  abstract save(branding: AppBranding): Promise<AppBranding>;
  abstract listImages(brandCode: string): Promise<AppBrandingImage[]>;
  abstract findImage(brandCode: string, id: string): Promise<AppBrandingImage | null>;
  abstract nextImageSortOrder(brandCode: string): Promise<number>;
  abstract saveImage(image: AppBrandingImage): Promise<AppBrandingImage>;
  abstract deleteImage(id: string): Promise<void>;
}
