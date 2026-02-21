import { Inject, Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import sharp from "sharp";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";

export interface ScrapedBranding {
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

interface ExtractedPageData {
  logoUrl: string | null;
  primaryColor: string | null;
}

@Injectable()
export class BrandingScraperService {
  private readonly logger = new Logger(BrandingScraperService.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async scrapeBranding(websiteUrl: string, companyId: number): Promise<ScrapedBranding> {
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      await page.goto(websiteUrl, { waitUntil: "networkidle2", timeout: 30000 });

      const extracted = await page.evaluate(() => {
        const findLogoUrl = (): string | null => {
          const appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
          if (appleTouchIcon?.href) {
            return appleTouchIcon.href;
          }

          const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
          if (ogImage?.content) {
            return ogImage.content;
          }

          const favicons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
          const largeFavicon = favicons
            .filter((f) => {
              const sizes = f.getAttribute("sizes");
              if (!sizes) {
                return false;
              }
              const size = parseInt(sizes.split("x")[0], 10);
              return size >= 96;
            })
            .sort((a, b) => {
              const sizeA = parseInt(a.getAttribute("sizes")?.split("x")[0] ?? "0", 10);
              const sizeB = parseInt(b.getAttribute("sizes")?.split("x")[0] ?? "0", 10);
              return sizeB - sizeA;
            })[0];
          if (largeFavicon?.href) {
            return largeFavicon.href;
          }

          const headerImgs = Array.from(
            document.querySelectorAll<HTMLImageElement>("header img, nav img, .header img, .nav img"),
          );
          const logoImg = headerImgs.find((img) => {
            const src = (img.src || "").toLowerCase();
            const alt = (img.alt || "").toLowerCase();
            const className = (img.className || "").toLowerCase();
            return src.includes("logo") || alt.includes("logo") || className.includes("logo");
          });
          if (logoImg?.src) {
            return logoImg.src;
          }

          if (headerImgs[0]?.src) {
            return headerImgs[0].src;
          }

          return new URL("/favicon.ico", window.location.origin).href;
        };

        const findPrimaryColor = (): string | null => {
          const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
          if (themeColor?.content) {
            return themeColor.content;
          }

          const header = document.querySelector("header") || document.querySelector("nav");
          if (header) {
            const computed = window.getComputedStyle(header);
            const bg = computed.backgroundColor;
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
              return bg;
            }
          }

          return null;
        };

        return {
          logoUrl: findLogoUrl(),
          primaryColor: findPrimaryColor(),
        } as ExtractedPageData;
      });

      const logoUrl = await this.processAndStoreLogo(extracted.logoUrl, companyId);
      const colors = await this.resolveColors(extracted.primaryColor, extracted.logoUrl);

      return {
        logoUrl,
        primaryColor: colors.primary,
        accentColor: colors.accent,
      };
    } catch (error) {
      this.logger.error(`Branding scraping failed for ${websiteUrl}: ${error instanceof Error ? error.message : String(error)}`);
      return { logoUrl: null, primaryColor: null, accentColor: null };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async processAndStoreLogo(rawLogoUrl: string | null, companyId: number): Promise<string | null> {
    if (!rawLogoUrl) {
      return null;
    }

    try {
      const response = await fetch(rawLogoUrl);
      if (!response.ok) {
        this.logger.warn(`Logo download failed (${response.status}) from ${rawLogoUrl}`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const resized = await sharp(buffer)
        .resize(512, 512, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();

      const file = {
        fieldname: "logo",
        originalname: `company-${companyId}-logo.png`,
        encoding: "7bit",
        mimetype: "image/png",
        size: resized.length,
        buffer: resized,
      } as Express.Multer.File;

      const result = await this.storageService.upload(file, `stock-control/branding/${companyId}`);
      return result.url;
    } catch (error) {
      this.logger.error(`Logo processing failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async resolveColors(
    htmlColor: string | null,
    logoUrl: string | null,
  ): Promise<{ primary: string | null; accent: string | null }> {
    const primaryHex = htmlColor
      ? this.normalizeToHex(htmlColor)
      : await this.dominantColorFromImage(logoUrl);

    if (!primaryHex) {
      return { primary: null, accent: null };
    }

    return {
      primary: primaryHex,
      accent: this.lightenColor(primaryHex),
    };
  }

  private async dominantColorFromImage(imageUrl: string | null): Promise<string | null> {
    if (!imageUrl) {
      return null;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const { dominant } = await sharp(buffer).stats();
      return `#${[dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    } catch (error) {
      this.logger.warn(`Dominant color extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private normalizeToHex(color: string): string | null {
    if (color.startsWith("#")) {
      return color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    }

    const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return `#${[r, g, b].map((c) => parseInt(c, 10).toString(16).padStart(2, "0")).join("")}`;
    }

    return null;
  }

  private lightenColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.4));

    return `#${[lighten(r), lighten(g), lighten(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }
}
