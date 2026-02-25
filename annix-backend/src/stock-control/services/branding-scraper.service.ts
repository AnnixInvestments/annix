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
    try {
      this.logger.log(`Starting candidate scrape for ${websiteUrl}`);
      return await this.scrapeCandidatesWithPuppeteer(websiteUrl);
    } catch (error) {
      this.logger.warn(
        `Puppeteer scraping failed, falling back to fetch-based extraction: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.scrapeCandidatesWithFetch(websiteUrl);
    }
  }

  private async scrapeCandidatesWithFetch(websiteUrl: string): Promise<ScrapedBrandingCandidates> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(websiteUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`Fetch scraping failed: HTTP ${response.status}`);
        return { logoCandidates: [], heroCandidates: [], primaryColor: null };
      }

      const html = await response.text();
      const baseUrl = new URL(websiteUrl);

      const resolveUrl = (raw: string): string | null => {
        if (!raw || raw.startsWith("data:")) {
          return null;
        }
        try {
          return new URL(raw, baseUrl.origin).href;
        } catch {
          return null;
        }
      };

      const logoCandidates: CandidateImage[] = [];
      const heroCandidates: CandidateImage[] = [];
      const seenLogos = new Set<string>();
      const seenHeroes = new Set<string>();

      const addLogo = (url: string | null, source: string) => {
        if (!url || seenLogos.has(url) || logoCandidates.length >= 20) return;
        seenLogos.add(url);
        logoCandidates.push({ url, source, width: null, height: null });
      };

      const addHero = (url: string | null, source: string) => {
        if (!url || seenHeroes.has(url) || heroCandidates.length >= 20) return;
        seenHeroes.add(url);
        heroCandidates.push({ url, source, width: null, height: null });
      };

      const imgTagPattern = /<img\s[^>]*?>/gi;
      const srcPattern = /src=["']([^"']+)["']/i;
      const altPattern = /alt=["']([^"']+)["']/i;
      const classPattern = /class=["']([^"']+)["']/i;
      const idPattern = /id=["']([^"']+)["']/i;

      const imgTags = html.match(imgTagPattern) ?? [];
      imgTags.forEach((tag) => {
        const srcMatch = tag.match(srcPattern);
        const src = srcMatch ? resolveUrl(srcMatch[1]) : null;
        if (!src) return;

        const alt = tag.match(altPattern)?.[1] ?? "";
        const cls = tag.match(classPattern)?.[1] ?? "";
        const id = tag.match(idPattern)?.[1] ?? "";
        const combined = `${src} ${alt} ${cls} ${id}`.toLowerCase();

        if (combined.includes("logo")) {
          addLogo(src, "logo-attr");
        }

        if (
          combined.includes("hero") ||
          combined.includes("banner") ||
          combined.includes("slider") ||
          combined.includes("carousel")
        ) {
          addHero(src, "hero-selector");
        }
      });

      const headerPattern = /<(?:header|nav)[^>]*>[\s\S]*?<\/(?:header|nav)>/gi;
      const headerBlocks = html.match(headerPattern) ?? [];
      headerBlocks.forEach((block) => {
        const headerImgs = block.match(imgTagPattern) ?? [];
        headerImgs.forEach((tag) => {
          const srcMatch = tag.match(srcPattern);
          const src = srcMatch ? resolveUrl(srcMatch[1]) : null;
          if (src) addLogo(src, "header-img");
        });
      });

      const ogImagePattern = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i;
      const ogImageAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i;
      const ogMatch = html.match(ogImagePattern) ?? html.match(ogImageAlt);
      if (ogMatch?.[1]) {
        const ogUrl = resolveUrl(ogMatch[1]);
        addLogo(ogUrl, "og-image");
        addHero(ogUrl, "og-image");
      }

      const faviconPattern =
        /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/gi;
      const faviconAltPattern =
        /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/gi;
      [faviconPattern, faviconAltPattern].forEach((pattern) => {
        let match: RegExpExecArray | null = null;
        while ((match = pattern.exec(html)) !== null) {
          const url = resolveUrl(match[1]);
          if (url) addLogo(url, "favicon");
        }
      });

      addLogo(resolveUrl("/favicon.ico"), "favicon");

      const bgUrlPattern = /background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/gi;
      let bgMatch: RegExpExecArray | null = null;
      while ((bgMatch = bgUrlPattern.exec(html)) !== null) {
        const url = resolveUrl(bgMatch[1]);
        if (url) addHero(url, "bg-image");
      }

      let primaryColor: string | null = null;
      const themeColorPattern = /<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i;
      const themeColorAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']theme-color["']/i;
      const themeMatch = html.match(themeColorPattern) ?? html.match(themeColorAlt);
      if (themeMatch?.[1]) {
        primaryColor = themeMatch[1];
      }

      this.logger.log(
        `Fetch-based scrape found ${logoCandidates.length} logo candidates, ${heroCandidates.length} hero candidates`,
      );

      return { logoCandidates, heroCandidates, primaryColor };
    } catch (error) {
      this.logger.error(
        `Fetch-based scraping also failed for ${websiteUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { logoCandidates: [], heroCandidates: [], primaryColor: null };
    }
  }

  private async scrapeCandidatesWithPuppeteer(
    websiteUrl: string,
  ): Promise<ScrapedBrandingCandidates> {
    let browser: puppeteer.Browser | null = null;

    try {
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

        const logoCandidates: {
          url: string;
          source: string;
          width: number | null;
          height: number | null;
        }[] = [];

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
          .forEach((img) =>
            addCandidate(logoCandidates, img.src, "logo-attr", img.naturalWidth, img.naturalHeight),
          );

        Array.from(
          document.querySelectorAll<HTMLImageElement>("header img, nav img, .header img, .nav img"),
        ).forEach((img) =>
          addCandidate(logoCandidates, img.src, "header-img", img.naturalWidth, img.naturalHeight),
        );

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

        const heroCandidates: {
          url: string;
          source: string;
          width: number | null;
          height: number | null;
        }[] = [];
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
            if (
              bg &&
              bg !== "rgba(0, 0, 0, 0)" &&
              bg !== "transparent" &&
              bg !== "rgb(255, 255, 255)"
            ) {
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
      this.logger.warn(
        `Image download error for ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async processAndStoreLogo(
    logoBuffer: Buffer | null,
    companyId: number,
  ): Promise<string | null> {
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
      this.logger.log(`Logo uploaded: ${result.path}`);
      return result.path;
    } catch (error) {
      this.logger.error(
        `Logo processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async processAndStoreHeroImage(
    heroUrl: string | null,
    companyId: number,
  ): Promise<string | null> {
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
      this.logger.log(`Hero image uploaded: ${result.path}`);
      return result.path;
    } catch (error) {
      this.logger.warn(
        `Hero image processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
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

      this.logger.log(
        `Dominant logo color: rgb(${r},${g},${b}) from ${colorCounts.size} color buckets`,
      );
      return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    } catch (error) {
      this.logger.warn(
        `Dominant color extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
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
