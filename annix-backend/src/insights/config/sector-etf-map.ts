/**
 * Map of free-form sector strings (as stored on insights_assets.sector)
 * to the ETF that best represents that sector's daily trend.
 *
 * Sectors that don't have a clean public ETF proxy intentionally have
 * no entry — the SectorTrendSignalService returns 50 (neutral) for those.
 *
 * Backend-local because no frontend consumer needs it. If a frontend
 * use case appears, move to packages/product-data/insights and update
 * docs/shared-registry.md per the discovery-first protocol.
 */
export const SECTOR_TO_ETF: Readonly<Record<string, string>> = {
  "Diversified Mining": "COPX",
  "PGM Mining": "COPX",
  "Copper Mining": "COPX",
  "Gold Miners (2x)": "GLD",
  "Precious Metals": "GLD",
  Uranium: "URA",
  Energy: "XLE",
  Industrials: "XLI",
  Financials: "XLF",
  Banking: "XLF",
  Agriculture: "DBA",
  Technology: "QQQ",
  "US Tech": "QQQ",
  "US Tech (3x)": "QQQ",
  "US Equity": "SPY",
  "SA Equity": "STX40.JO",
  Semiconductors: "QQQ",
  "Semiconductors (3x)": "QQQ",
  "Consumer Discretionary": "SPY",
} as const;

export function sectorTrendEtf(sector: string | null | undefined): string | null {
  if (!sector) return null;
  const direct = SECTOR_TO_ETF[sector];
  if (direct) return direct;
  return null;
}
