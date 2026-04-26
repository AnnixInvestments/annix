import { Injectable, Logger } from "@nestjs/common";
import { PuppeteerPoolService } from "../shared/services/puppeteer-pool.service";

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
  colorCandidates: string[];
}

@Injectable()
export class RubberBrandingService {
  private readonly logger = new Logger(RubberBrandingService.name);

  constructor(private readonly puppeteerPool: PuppeteerPoolService) {}

  async scrapeCandidates(websiteUrl: string): Promise<ScrapedBrandingCandidates> {
    let puppeteerResult: ScrapedBrandingCandidates | null = null;
    try {
      this.logger.log(`Starting candidate scrape for ${websiteUrl}`);
      puppeteerResult = await this.scrapeCandidatesWithPuppeteer(websiteUrl);
    } catch (error) {
      this.logger.warn(
        `Puppeteer scraping threw, falling back to fetch-based extraction: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const isEmpty = (r: ScrapedBrandingCandidates | null): boolean =>
      !r ||
      (r.logoCandidates.length === 0 &&
        r.heroCandidates.length === 0 &&
        !r.primaryColor &&
        r.colorCandidates.length === 0);

    if (!isEmpty(puppeteerResult)) {
      return puppeteerResult as ScrapedBrandingCandidates;
    }

    this.logger.warn(
      `Puppeteer returned no candidates for ${websiteUrl}, trying fetch-based extraction`,
    );
    const fetchResult = await this.scrapeCandidatesWithFetch(websiteUrl);
    return fetchResult;
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
        return { logoCandidates: [], heroCandidates: [], primaryColor: null, colorCandidates: [] };
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
      const widthPattern = /width=["']?(\d+)/i;
      const heightPattern = /height=["']?(\d+)/i;

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
          combined.includes("carousel") ||
          combined.includes("featured")
        ) {
          addHero(src, "hero-selector");
        }

        const widthMatch = tag.match(widthPattern);
        const heightMatch = tag.match(heightPattern);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : 0;
        const height = heightMatch ? parseInt(heightMatch[1], 10) : 0;

        if (width >= 600 || height >= 300) {
          if (!combined.includes("logo") && !combined.includes("icon")) {
            addHero(src, "large-img");
          }
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
        Array.from(html.matchAll(pattern)).forEach((match) => {
          const url = resolveUrl(match[1]);
          if (url) addLogo(url, "favicon");
        });
      });

      addLogo(resolveUrl("/favicon.ico"), "favicon");

      const bgUrlPattern = /background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/gi;
      Array.from(html.matchAll(bgUrlPattern)).forEach((bgMatch) => {
        const url = resolveUrl(bgMatch[1]);
        if (url) addHero(url, "bg-image");
      });

      const sectionPattern = /<section[^>]*>[\s\S]*?<\/section>/gi;
      const sectionBlocks = html.match(sectionPattern) ?? [];
      sectionBlocks.slice(0, 3).forEach((block) => {
        const sectionImgs = block.match(imgTagPattern) ?? [];
        sectionImgs.forEach((tag) => {
          const srcMatch = tag.match(srcPattern);
          const src = srcMatch ? resolveUrl(srcMatch[1]) : null;
          if (src && !src.toLowerCase().includes("logo")) {
            addHero(src, "section-img");
          }
        });
      });

      const srcsetPattern = /srcset=["']([^"']+)["']/gi;
      Array.from(html.matchAll(srcsetPattern)).forEach((srcsetMatch) => {
        const srcset = srcsetMatch[1];
        const urls = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]);
        const largestUrl = urls[urls.length - 1];
        const resolved = resolveUrl(largestUrl);
        if (resolved && !resolved.toLowerCase().includes("logo")) {
          addHero(resolved, "srcset-img");
        }
      });

      const wpFeaturedPattern = /wp-post-image|attachment-full|size-full/i;
      imgTags.forEach((tag) => {
        if (wpFeaturedPattern.test(tag)) {
          const srcMatch = tag.match(srcPattern);
          const src = srcMatch ? resolveUrl(srcMatch[1]) : null;
          if (src) addHero(src, "wp-featured");
        }
      });

      const isValidColorValue = (color: string): boolean => {
        const invalid = ["transparent", "#fff", "#ffffff", "#000", "#000000", "white", "black"];
        return !invalid.includes(color.toLowerCase().trim());
      };

      const colorBag: string[] = [];
      const seenColors = new Set<string>();
      const addColor = (raw: string | null | undefined) => {
        if (!raw || colorBag.length >= 24) return;
        const normalized = this.normalizeToHex(raw)?.toLowerCase();
        if (!normalized || !isValidColorValue(normalized) || seenColors.has(normalized)) return;
        seenColors.add(normalized);
        colorBag.push(normalized);
      };

      const themeColorPattern = /<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i;
      const themeColorAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']theme-color["']/i;
      const themeMatch = html.match(themeColorPattern) ?? html.match(themeColorAlt);
      if (themeMatch?.[1]) {
        addColor(themeMatch[1]);
      }

      const colorPatterns = [
        /\.(?:btn|button)[^{]*\{[^}]*background(?:-color)?:\s*([#][0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi,
        /\.(?:primary|accent|brand)[^{]*\{[^}]*(?:background-)?color:\s*([#][0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi,
        /--(?:primary|brand|accent|main|secondary|tertiary|highlight)(?:-color)?:\s*([#][0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi,
        /header[^{]*\{[^}]*background(?:-color)?:\s*([#][0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi,
        /nav[^{]*\{[^}]*background(?:-color)?:\s*([#][0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi,
        /footer[^{]*\{[^}]*background(?:-color)?:\s*([#][0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\))/gi,
      ];
      colorPatterns.forEach((pattern) => {
        Array.from(html.matchAll(pattern)).forEach((match) => addColor(match[1]));
      });

      const hexColors = html.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
      const hexCounts: Record<string, number> = {};
      hexColors.forEach((c) => {
        const lower = c.toLowerCase();
        if (
          isValidColorValue(lower) &&
          !["#f0f0f0", "#e0e0e0", "#cccccc", "#333333"].includes(lower)
        ) {
          hexCounts[lower] = (hexCounts[lower] || 0) + 1;
        }
      });
      Object.entries(hexCounts)
        .sort((a, b) => b[1] - a[1])
        .filter(([, count]) => count >= 2)
        .slice(0, 12)
        .forEach(([c]) => addColor(c));

      const primaryColor = colorBag.length > 0 ? colorBag[0] : null;

      this.logger.log(
        `Fetch-based scrape found ${colorBag.length} color candidates, primary: ${primaryColor}`,
      );
      this.logger.log(
        `Fetch-based scrape found ${logoCandidates.length} logo candidates, ${heroCandidates.length} hero candidates`,
      );

      return { logoCandidates, heroCandidates, primaryColor, colorCandidates: colorBag };
    } catch (error) {
      this.logger.error(
        `Fetch-based scraping also failed for ${websiteUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { logoCandidates: [], heroCandidates: [], primaryColor: null, colorCandidates: [] };
    }
  }

  private async scrapeCandidatesWithPuppeteer(
    websiteUrl: string,
  ): Promise<ScrapedBrandingCandidates> {
    const allLogoCandidates: CandidateImage[] = [];
    const allHeroCandidates: CandidateImage[] = [];
    const allColors: string[] = [];
    const seenLogoUrls = new Set<string>();
    const seenHeroUrls = new Set<string>();
    const seenColors = new Set<string>();

    const isValidColorValue = (color: string): boolean => {
      const invalid = ["transparent", "#fff", "#ffffff", "#000", "#000000"];
      return !invalid.includes(color.toLowerCase().trim());
    };

    const mergeResult = (result: ScrapedBrandingCandidates) => {
      result.logoCandidates.forEach((c) => {
        if (!seenLogoUrls.has(c.url) && allLogoCandidates.length < 16) {
          seenLogoUrls.add(c.url);
          allLogoCandidates.push(c);
        }
      });
      result.heroCandidates.forEach((c) => {
        if (!seenHeroUrls.has(c.url) && allHeroCandidates.length < 40) {
          seenHeroUrls.add(c.url);
          allHeroCandidates.push(c);
        }
      });
      result.colorCandidates.forEach((c) => {
        const normalized = this.normalizeToHex(c)?.toLowerCase();
        if (
          normalized &&
          isValidColorValue(normalized) &&
          !seenColors.has(normalized) &&
          allColors.length < 16
        ) {
          seenColors.add(normalized);
          allColors.push(normalized);
        }
      });
    };

    let internalUrls: string[] = [];
    try {
      const homepage = await this.scrapeOnePageWithDiscovery(websiteUrl);
      mergeResult(homepage.candidates);
      internalUrls = homepage.internalUrls;
      this.logger.log(
        `Discovered ${internalUrls.length} internal pages: ${internalUrls.join(", ")}`,
      );
    } catch (error) {
      this.logger.warn(
        `Homepage scrape failed for ${websiteUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    for (const pageUrl of internalUrls) {
      if (allHeroCandidates.length >= 40 && allColors.length >= 16) break;

      try {
        const result = await this.scrapeOnePage(pageUrl, "domcontentloaded");
        mergeResult(result);
      } catch (error) {
        this.logger.warn(
          `Failed to scrape ${pageUrl}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const primaryColor = allColors.length > 0 ? allColors[0] : null;

    this.logger.log(
      `Total across ${1 + internalUrls.length} pages: ${allLogoCandidates.length} logos, ${allHeroCandidates.length} hero images, ${allColors.length} colors`,
    );

    return {
      logoCandidates: allLogoCandidates,
      heroCandidates: allHeroCandidates,
      primaryColor,
      colorCandidates: allColors,
    };
  }

  private async scrapeOnePageWithDiscovery(
    websiteUrl: string,
  ): Promise<{ candidates: ScrapedBrandingCandidates; internalUrls: string[] }> {
    const baseOrigin = new URL(websiteUrl).origin;
    const homepagePath =
      new URL(websiteUrl).origin + new URL(websiteUrl).pathname.replace(/\/$/, "");

    const extracted = await this.puppeteerPool.executeWithPage({
      url: websiteUrl,
      waitUntil: "domcontentloaded",
      timeout: 25000,
      execute: async (page) => {
        const candidates = await this.runPageEvaluate(page);
        const internalUrls = await page.evaluate((origin) => {
          const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
          const internal = new Set<string>();
          links.forEach((a) => {
            try {
              const url = new URL(a.href, origin);
              if (
                url.origin === origin &&
                !url.hash &&
                !url.pathname.match(/\.(pdf|zip|jpg|png|gif|svg|css|js|webp|ico)$/i)
              ) {
                internal.add(url.origin + url.pathname.replace(/\/$/, ""));
              }
            } catch {
              // ignore invalid URLs
            }
          });
          return Array.from(internal);
        }, baseOrigin);
        return { candidates, internalUrls };
      },
    });

    const filtered = extracted.internalUrls
      .filter((u) => u !== homepagePath && u !== baseOrigin)
      .slice(0, 6);

    this.logger.log(
      `[${websiteUrl}] Found ${extracted.candidates.logoCandidates.length} logo, ${extracted.candidates.heroCandidates.length} hero, ${extracted.candidates.colorCandidates.length} colors (homepage)`,
    );

    return { candidates: extracted.candidates, internalUrls: filtered };
  }

  private async scrapeOnePage(
    pageUrl: string,
    waitUntil: "domcontentloaded" | "networkidle2" = "networkidle2",
  ): Promise<ScrapedBrandingCandidates> {
    const extracted = await this.puppeteerPool.executeWithPage({
      url: pageUrl,
      waitUntil,
      timeout: 20000,
      execute: async (page) => this.runPageEvaluate(page),
    });

    this.logger.log(
      `[${pageUrl}] Found ${extracted.logoCandidates.length} logo, ${extracted.heroCandidates.length} hero, ${extracted.colorCandidates.length} colors`,
    );

    return extracted;
  }

  private async runPageEvaluate(
    page: import("puppeteer").Page,
  ): Promise<ScrapedBrandingCandidates> {
    return page.evaluate(() => {
      const seen = new Set<string>();

      const addCandidate = (
        list: { url: string; source: string; width: number | null; height: number | null }[],
        url: string | null | undefined,
        source: string,
        width: number | null = null,
        height: number | null = null,
      ) => {
        if (!url || url.startsWith("data:") || seen.has(url) || list.length >= 30) {
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
        if (!url || url.startsWith("data:") || heroSeen.has(url) || heroCandidates.length >= 30) {
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

      const isValidColor = (color: string | null): boolean => {
        if (!color) return false;
        const invalid = [
          "rgba(0, 0, 0, 0)",
          "transparent",
          "rgb(255, 255, 255)",
          "rgb(0, 0, 0)",
          "#ffffff",
          "#fff",
          "#000000",
          "#000",
        ];
        return !invalid.includes(color.toLowerCase());
      };

      const colorCandidates: string[] = [];
      const colorSeen = new Set<string>();
      const addColor = (color: string | null | undefined) => {
        if (!color || !isValidColor(color) || colorCandidates.length >= 16) return;
        const lower = color.toLowerCase();
        if (colorSeen.has(lower)) return;
        colorSeen.add(lower);
        colorCandidates.push(color);
      };

      const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (themeColor?.content) addColor(themeColor.content);

      ["header", "nav", "footer"].forEach((tag) => {
        const el = document.querySelector(tag);
        if (el) {
          const computed = window.getComputedStyle(el);
          addColor(computed.backgroundColor);
          addColor(computed.color);
        }
      });

      const buttons = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, .btn, [class*="button"], a[class*="btn"], input[type="submit"]',
        ),
      ).slice(0, 20);
      const buttonBgCounts: Record<string, number> = {};
      buttons.forEach((btn) => {
        const computed = window.getComputedStyle(btn);
        const bg = computed.backgroundColor;
        if (isValidColor(bg)) {
          buttonBgCounts[bg] = (buttonBgCounts[bg] || 0) + 1;
        }
      });
      Object.entries(buttonBgCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .forEach(([c]) => addColor(c));

      const linkColorCounts: Record<string, number> = {};
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
        .slice(0, 30)
        .forEach((link) => {
          const color = window.getComputedStyle(link).color;
          if (isValidColor(color) && color !== "rgb(0, 0, 238)") {
            linkColorCounts[color] = (linkColorCounts[color] || 0) + 1;
          }
        });
      Object.entries(linkColorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([c]) => addColor(c));

      const accentSelectors = [
        "[class*='primary']",
        "[class*='accent']",
        "[class*='brand']",
        "[class*='highlight']",
        ".active",
        ".selected",
      ];
      accentSelectors.forEach((sel) => {
        Array.from(document.querySelectorAll<HTMLElement>(sel))
          .slice(0, 4)
          .forEach((el) => {
            const computed = window.getComputedStyle(el);
            addColor(computed.backgroundColor);
            addColor(computed.color);
          });
      });

      const cssVarRoot = window.getComputedStyle(document.documentElement);
      [
        "--primary",
        "--brand",
        "--accent",
        "--main-color",
        "--color-primary",
        "--secondary",
        "--tertiary",
      ].forEach((name) => {
        const val = cssVarRoot.getPropertyValue(name).trim();
        if (val) addColor(val);
      });

      const primaryColor = colorCandidates.length > 0 ? colorCandidates[0] : null;

      return { logoCandidates, heroCandidates, primaryColor, colorCandidates };
    });
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

  normalizeToHex(color: string): string | null {
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

  lightenColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.4));

    return `#${[lighten(r), lighten(g), lighten(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }
}
