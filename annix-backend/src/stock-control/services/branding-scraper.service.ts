import { Inject, Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import sharp from "sharp";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";

export interface CandidateImage {
  url: string;
  source: string;
  width: number | null;
  height: number | null;
}

export interface ScrapedBrandingCandidates {
  logoCandidates: CandidateImage[];
  heroCandidates: CandidateImage[];
  primaryColor: string | null;
}

export interface ProcessedBrandingResult {
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

@Injectable()
export class BrandingScraperService {
  private readonly logger = new Logger(BrandingScraperService.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async scrapeCandidates(websiteUrl: string): Promise<ScrapedBrandingCandidates> {
    let browser: puppeteer.Browser | null = null;

    try {
      this.logger.log(`Starting candidate scrape for ${websiteUrl}`);

      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      await page.goto(websiteUrl, { waitUntil: "networkidle2", timeout: 30000 });

      const extracted = await page.evaluate(() => {
        const seen = new Set<string>();

        const addCandidate = (
          list: { url: string; source: string; width: number | null; height: number | null }[],
          url: string | null | undefined,
          source: string,
          width: number | null = null,
          height: number | null = null,
        ) => {
          if (!url || url.startsWith("data:") || seen.has(url) || list.length >= 20) {
            return;
          }
          seen.add(url);
          list.push({ url, source, width, height });
        };

        const logoCandidates: { url: string; source: string; width: number | null; height: number | null }[] = [];

        const allImgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
        allImgs
          .filter((img) => {
            const src = (img.src || "").toLowerCase();
            const alt = (img.alt || "").toLowerCase();
            const className = (img.className || "").toLowerCase();
            const id = (img.id || "").toLowerCase();
            return (
              src.includes("logo") ||
              alt.includes("logo") ||
              className.includes("logo") ||
              id.includes("logo")
            );
          })
          .forEach((img) => addCandidate(logoCandidates, img.src, "logo-attr", img.naturalWidth, img.naturalHeight));

        Array.from(
          document.querySelectorAll<HTMLImageElement>("header img, nav img, .header img, .nav img"),
        ).forEach((img) => addCandidate(logoCandidates, img.src, "header-img", img.naturalWidth, img.naturalHeight));

        const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
        if (ogImage?.content) {
          addCandidate(logoCandidates, ogImage.content, "og-image");
        }

        Array.from(
          document.querySelectorAll<HTMLLinkElement>(
            'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
          ),
        ).forEach((link) => addCandidate(logoCandidates, link.href, "favicon"));

        const faviconUrl = new URL("/favicon.ico", window.location.origin).href;
        addCandidate(logoCandidates, faviconUrl, "favicon");

        const heroCandidates: { url: string; source: string; width: number | null; height: number | null }[] = [];
        const heroSeen = new Set<string>();

        const addHero = (
          url: string | null | undefined,
          source: string,
          width: number | null = null,
          height: number | null = null,
        ) => {
          if (!url || url.startsWith("data:") || heroSeen.has(url) || heroCandidates.length >= 20) {
            return;
          }
          heroSeen.add(url);
          heroCandidates.push({ url, source, width, height });
        };

        if (ogImage?.content) {
          addHero(ogImage.content, "og-image");
        }

        const heroSelectors = [
          ".hero img",
          ".banner img",
          "[class*='hero'] img",
          "[class*='banner'] img",
          "[class*='slider'] img",
          "[class*='carousel'] img",
          "section:first-of-type img",
        ];
        heroSelectors.forEach((sel) => {
          Array.from(document.querySelectorAll<HTMLImageElement>(sel)).forEach((img) => {
            if (img.naturalWidth >= 400) {
              addHero(img.src, "hero-selector", img.naturalWidth, img.naturalHeight);
            }
          });
        });

        const bgElements = document.querySelectorAll("section, div, header");
        Array.from(bgElements).forEach((el) => {
          const style = window.getComputedStyle(el);
          const bgImg = style.backgroundImage;
          if (bgImg && bgImg !== "none") {
            const urlMatch = bgImg.match(/url\(["']?(.*?)["']?\)/);
            if (urlMatch?.[1] && !urlMatch[1].startsWith("data:")) {
              addHero(urlMatch[1], "bg-image");
            }
          }
        });

        Array.from(document.querySelectorAll<HTMLImageElement>("img"))
          .filter((img) => img.naturalWidth >= 600 && img.naturalHeight >= 300)
          .filter((img) => !(img.src || "").toLowerCase().includes("logo"))
          .forEach((img) => addHero(img.src, "large-img", img.naturalWidth, img.naturalHeight));

        let primaryColor: string | null = null;
        const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
        if (themeColor?.content) {
          primaryColor = themeColor.content;
        } else {
          const header = document.querySelector("header") || document.querySelector("nav");
          if (header) {
            const computed = window.getComputedStyle(header);
            const bg = computed.backgroundColor;
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "rgb(255, 255, 255)") {
              primaryColor = bg;
            }
          }
        }

        return { logoCandidates, heroCandidates, primaryColor };
      });

      this.logger.log(
        `Found ${extracted.logoCandidates.length} logo candidates, ${extracted.heroCandidates.length} hero candidates`,
      );

      await browser.close();
      browser = null;

      return {
        logoCandidates: extracted.logoCandidates,
        heroCandidates: extracted.heroCandidates,
        primaryColor: extracted.primaryColor,
      };
    } catch (error) {
      this.logger.error(
        `Candidate scraping failed for ${websiteUrl}: ${error instanceof Error ? error.stack : String(error)}`,
      );
      return { logoCandidates: [], heroCandidates: [], primaryColor: null };
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          this.logger.warn("Browser close failed");
        }
      }
    }
  }

  async processAndStoreSelected(
    companyId: number,
    logoSourceUrl: string | null,
    heroSourceUrl: string | null,
    scrapedPrimaryColor: string | null,
  ): Promise<ProcessedBrandingResult> {
    try {
      this.logger.log(
        `Processing selected branding for company ${companyId} - logo: ${logoSourceUrl}, hero: ${heroSourceUrl}`,
      );

      const logoBuffer = await this.downloadImage(logoSourceUrl);
      const logoUrl = await this.processAndStoreLogo(logoBuffer, companyId);
      const heroImageUrl = await this.processAndStoreHeroImage(heroSourceUrl, companyId);
      const colors = await this.resolveColors(scrapedPrimaryColor, logoBuffer);

      this.logger.log(
        `Processed result - logo: ${logoUrl}, hero: ${heroImageUrl}, primary: ${colors.primary}, accent: ${colors.accent}`,
      );

      return {
        logoUrl,
        heroImageUrl,
        primaryColor: colors.primary,
        accentColor: colors.accent,
      };
    } catch (error) {
      this.logger.error(
        `Branding processing failed for company ${companyId}: ${error instanceof Error ? error.stack : String(error)}`,
      );
      return { logoUrl: null, heroImageUrl: null, primaryColor: null, accentColor: null };
    }
  }

  async proxyImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get("content-type") || "image/png";
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > 5 * 1024 * 1024) {
        return null;
      }

      return { buffer, contentType };
    } catch {
      return null;
    }
  }

  private async downloadImage(url: string | null): Promise<Buffer | null> {
    if (!url) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`Image download failed (${response.status}) from ${url}`);
        return null;
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      this.logger.warn(`Image download error for ${url}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async processAndStoreLogo(logoBuffer: Buffer | null, companyId: number): Promise<string | null> {
    if (!logoBuffer || logoBuffer.length === 0) {
      this.logger.warn("No logo buffer to process");
      return null;
    }

    try {
      const resized = await sharp(logoBuffer)
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
      this.logger.log(`Logo uploaded: ${result.url}`);
      return result.url;
    } catch (error) {
      this.logger.error(`Logo processing failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async processAndStoreHeroImage(heroUrl: string | null, companyId: number): Promise<string | null> {
    if (!heroUrl) {
      return null;
    }

    try {
      const heroBuffer = await this.downloadImage(heroUrl);
      if (!heroBuffer || heroBuffer.length === 0) {
        return null;
      }

      const resized = await sharp(heroBuffer)
        .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const file = {
        fieldname: "hero",
        originalname: `company-${companyId}-hero.jpg`,
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: resized.length,
        buffer: resized,
      } as Express.Multer.File;

      const result = await this.storageService.upload(file, `stock-control/branding/${companyId}`);
      this.logger.log(`Hero image uploaded: ${result.url}`);
      return result.url;
    } catch (error) {
      this.logger.warn(`Hero image processing failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async resolveColors(
    htmlColor: string | null,
    logoBuffer: Buffer | null,
  ): Promise<{ primary: string | null; accent: string | null }> {
    const logoColor = await this.dominantColorFromBuffer(logoBuffer);
    const pageColor = htmlColor ? this.normalizeToHex(htmlColor) : null;
    const primaryHex = logoColor ?? pageColor;

    if (!primaryHex) {
      return { primary: null, accent: null };
    }

    return {
      primary: primaryHex,
      accent: this.lightenColor(primaryHex),
    };
  }

  private async dominantColorFromBuffer(buffer: Buffer | null): Promise<string | null> {
    if (!buffer || buffer.length === 0) {
      return null;
    }

    try {
      const { data, info } = await sharp(buffer)
        .resize(64, 64, { fit: "inside" })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colorCounts = new Map<string, number>();
      const channels = info.channels;

      for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (this.isNeutral(r, g, b)) {
          continue;
        }

        const quantR = Math.round(r / 16) * 16;
        const quantG = Math.round(g / 16) * 16;
        const quantB = Math.round(b / 16) * 16;
        const key = `${quantR},${quantG},${quantB}`;
        colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
      }

      if (colorCounts.size === 0) {
        const { dominant } = await sharp(buffer).stats();
        return `#${[dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
      }

      const sorted = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
      const [topColor] = sorted[0];
      const [r, g, b] = topColor.split(",").map(Number);

      this.logger.log(`Dominant logo color: rgb(${r},${g},${b}) from ${colorCounts.size} color buckets`);
      return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    } catch (error) {
      this.logger.warn(`Dominant color extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private isNeutral(r: number, g: number, b: number): boolean {
    if (r > 220 && g > 220 && b > 220) {
      return true;
    }
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return maxDiff < 20;
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
