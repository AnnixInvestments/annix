import { Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";

export interface ExtractedBranding {
  url: string;
  companyName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  colors: {
    primary: string[];
    background: string[];
    text: string[];
    accent: string[];
  };
  extractedAt: string;
}

@Injectable()
export class RubberBrandingService {
  private readonly logger = new Logger(RubberBrandingService.name);

  async extractBrandingFromUrl(url: string): Promise<ExtractedBranding> {
    this.logger.log(`Extracting branding from: ${url}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      const branding = await page.evaluate(() => {
        const hexColorRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
        const rgbColorRegex = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;
        const rgbaColorRegex =
          /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*[\d.]+\s*\)/gi;

        const rgbToHex = (r: number, g: number, b: number): string => {
          return (
            "#" +
            [r, g, b]
              .map((x) => {
                const hex = x.toString(16);
                return hex.length === 1 ? `0${hex}` : hex;
              })
              .join("")
          );
        };

        const colorCounts: Record<string, number> = {};
        const backgroundColors: string[] = [];
        const textColors: string[] = [];

        const processColor = (color: string, isBackground: boolean, isText: boolean) => {
          const hex = color.toUpperCase();
          if (hex === "#FFFFFF" || hex === "#FFF" || hex === "#000000" || hex === "#000") {
            return;
          }
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          if (isBackground && !backgroundColors.includes(hex)) {
            backgroundColors.push(hex);
          }
          if (isText && !textColors.includes(hex)) {
            textColors.push(hex);
          }
        };

        const extractColorsFromStyle = (
          style: CSSStyleDeclaration,
          isBackground: boolean,
          isText: boolean,
        ) => {
          const bgColor = style.backgroundColor;
          const textColor = style.color;
          const borderColor = style.borderColor;

          [bgColor, textColor, borderColor].forEach((colorStr) => {
            if (!colorStr) return;

            const hexMatches = colorStr.match(hexColorRegex);
            if (hexMatches) {
              hexMatches.forEach((hex) => processColor(hex, isBackground, isText));
            }

            let match;
            const rgbRegex = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;
            while ((match = rgbRegex.exec(colorStr)) !== null) {
              const hex = rgbToHex(
                parseInt(match[1], 10),
                parseInt(match[2], 10),
                parseInt(match[3], 10),
              );
              processColor(hex, isBackground, isText);
            }

            const rgbaRegex =
              /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*[\d.]+\s*\)/gi;
            while ((match = rgbaRegex.exec(colorStr)) !== null) {
              const hex = rgbToHex(
                parseInt(match[1], 10),
                parseInt(match[2], 10),
                parseInt(match[3], 10),
              );
              processColor(hex, isBackground, isText);
            }
          });
        };

        const elements = document.querySelectorAll("*");
        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const isHeader =
            el.tagName === "HEADER" || el.tagName === "NAV" || el.classList.contains("header");
          const isText =
            el.tagName === "P" ||
            el.tagName === "H1" ||
            el.tagName === "H2" ||
            el.tagName === "A" ||
            el.tagName === "SPAN";
          extractColorsFromStyle(style, isHeader, isText);
        });

        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => color);

        const title = document.querySelector("title")?.textContent || null;
        const h1 = document.querySelector("h1")?.textContent?.trim() || null;
        const metaDesc =
          document.querySelector('meta[name="description"]')?.getAttribute("content") || null;

        const logoImg = document.querySelector(
          'img[class*="logo"], img[alt*="logo"], header img, .logo img',
        );
        let logoUrl: string | null = null;
        if (logoImg) {
          logoUrl = (logoImg as HTMLImageElement).src;
        }

        const primaryColors = sortedColors.slice(0, 5);
        const accentColors = sortedColors.filter((c) => {
          const r = parseInt(c.slice(1, 3), 16);
          const g = parseInt(c.slice(3, 5), 16);
          const b = parseInt(c.slice(5, 7), 16);
          const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
          return saturation > 0.3;
        });

        return {
          companyName: h1 || title?.split("|")[0]?.trim() || title?.split("-")[0]?.trim() || null,
          tagline: metaDesc,
          logoUrl,
          colors: {
            primary: primaryColors,
            background: backgroundColors.slice(0, 5),
            text: textColors.slice(0, 5),
            accent: accentColors.slice(0, 5),
          },
        };
      });

      return {
        url,
        ...branding,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to extract branding: ${error}`);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
