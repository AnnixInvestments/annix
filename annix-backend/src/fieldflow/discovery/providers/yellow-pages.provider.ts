import { Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import { DiscoveryProvider, DiscoverySearchParams } from "../discovery-source.interface";
import { DiscoveredBusiness, DiscoverySource } from "../dto";

interface ScrapedBusiness {
  name: string;
  address: string | null;
  phone: string | null;
  category: string | null;
}

@Injectable()
export class YellowPagesProvider implements DiscoveryProvider {
  private readonly logger = new Logger(YellowPagesProvider.name);
  readonly source = DiscoverySource.YELLOW_PAGES;

  isConfigured(): boolean {
    return true;
  }

  async search(params: DiscoverySearchParams): Promise<DiscoveredBusiness[]> {
    const results: DiscoveredBusiness[] = [];

    const searchTerms = params.searchTerms.slice(0, 3);

    for (const term of searchTerms) {
      const businesses = await this.scrapeYellowPages(term, params.latitude, params.longitude);
      results.push(...businesses);
    }

    return this.deduplicateResults(results);
  }

  private async scrapeYellowPages(
    searchTerm: string,
    centerLat: number,
    centerLng: number,
  ): Promise<DiscoveredBusiness[]> {
    let browser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;

    const location = await this.approximateCityFromCoordinates(centerLat, centerLng);

    const encodedTerm = encodeURIComponent(searchTerm);
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.yellowpages.co.za/search?what=${encodedTerm}&where=${encodedLocation}`;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      const scrapedBusinesses = await page.evaluate(() => {
        const results: ScrapedBusiness[] = [];
        const listings = document.querySelectorAll(".listing-item, .business-listing, .result");

        listings.forEach((listing) => {
          const nameEl = listing.querySelector(".listing-name, .business-name, h2, h3");
          const addressEl = listing.querySelector(".listing-address, .address, .location");
          const phoneEl = listing.querySelector(".listing-phone, .phone, [href^='tel:']");
          const categoryEl = listing.querySelector(".listing-category, .category");

          if (nameEl) {
            results.push({
              name: nameEl.textContent?.trim() ?? "",
              address: addressEl?.textContent?.trim() ?? null,
              phone: phoneEl?.textContent?.trim() ?? null,
              category: categoryEl?.textContent?.trim() ?? null,
            });
          }
        });

        return results;
      });

      return scrapedBusinesses
        .filter((b) => b.name)
        .map((business) =>
          this.transformScrapedBusiness(business, searchTerm, centerLat, centerLng),
        );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Yellow Pages scraping error: ${errorMessage}`);
      return [];
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {
          this.logger.warn("Page close failed");
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch {
          this.logger.warn("Browser close failed");
        }
      }
    }
  }

  private transformScrapedBusiness(
    business: ScrapedBusiness,
    searchTerm: string,
    centerLat: number,
    centerLng: number,
  ): DiscoveredBusiness {
    const addressParts = this.parseAddress(business.address);

    return {
      source: DiscoverySource.YELLOW_PAGES,
      externalId: this.generateExternalId(business.name, business.address),
      companyName: business.name,
      streetAddress: addressParts.street,
      city: addressParts.city,
      province: addressParts.province,
      latitude: centerLat,
      longitude: centerLng,
      phone: this.normalizePhone(business.phone),
      website: null,
      businessTypes: business.category ? [business.category, searchTerm] : [searchTerm],
      rating: null,
      userRatingsTotal: null,
    };
  }

  private parseAddress(address: string | null): {
    street: string | null;
    city: string | null;
    province: string | null;
  } {
    if (!address) {
      return { street: null, city: null, province: null };
    }

    const parts = address.split(",").map((p) => p.trim());

    if (parts.length >= 3) {
      return {
        street: parts[0],
        city: parts[1],
        province: parts[2],
      };
    }

    if (parts.length === 2) {
      return {
        street: parts[0],
        city: parts[1],
        province: null,
      };
    }

    return {
      street: parts[0],
      city: null,
      province: null,
    };
  }

  private normalizePhone(phone: string | null): string | null {
    if (!phone) {
      return null;
    }

    const digits = phone.replace(/\D/g, "");

    if (digits.startsWith("27") && digits.length === 11) {
      return `+${digits}`;
    }

    if (digits.startsWith("0") && digits.length === 10) {
      return `+27${digits.substring(1)}`;
    }

    return phone;
  }

  private generateExternalId(name: string, address: string | null): string {
    const combined = `${name}-${address ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return `yp-${combined.substring(0, 100)}`;
  }

  private async approximateCityFromCoordinates(lat: number, lng: number): Promise<string> {
    const cities = [
      { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
      { name: "Cape Town", lat: -33.9249, lng: 18.4241 },
      { name: "Durban", lat: -29.8587, lng: 31.0218 },
      { name: "Pretoria", lat: -25.7461, lng: 28.1881 },
      { name: "Port Elizabeth", lat: -33.918, lng: 25.5701 },
      { name: "Bloemfontein", lat: -29.0852, lng: 26.1596 },
      { name: "East London", lat: -33.0153, lng: 27.9116 },
      { name: "Polokwane", lat: -23.9045, lng: 29.4689 },
      { name: "Nelspruit", lat: -25.4753, lng: 30.9694 },
      { name: "Kimberley", lat: -28.7282, lng: 24.7499 },
    ];

    let closestCity = "Johannesburg";
    let minDistance = Infinity;

    for (const city of cities) {
      const distance = Math.sqrt((lat - city.lat) ** 2 + (lng - city.lng) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city.name;
      }
    }

    return closestCity;
  }

  private deduplicateResults(results: DiscoveredBusiness[]): DiscoveredBusiness[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      const key = result.externalId;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
