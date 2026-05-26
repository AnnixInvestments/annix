import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import {
  type NewsExtractionStatus,
  type NewsImpactLevel,
  NewsItem,
} from "../entities/news-item.entity";
import { INSIGHTS_ROLE } from "../insights.constants";
import { NewsItemRepository } from "../repositories/news-item.repository";

export interface NewsItemDto {
  id: string;
  url: string;
  title: string;
  source: string | null;
  summary: string | null;
  relatedSymbols: string[];
  relatedThemes: string[];
  sentiment: number | null;
  impactLevel: NewsImpactLevel | null;
  shortTermImplication: string | null;
  mediumTermImplication: string | null;
  publishedAt: string | null;
  extractedAt: string | null;
  extractionStatus: NewsExtractionStatus;
  extractionError: string | null;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@ApiTags("insights")
@Controller("insights/news")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(INSIGHTS_ROLE)
export class InsightsNewsController {
  constructor(private readonly newsRepo: NewsItemRepository) {}

  @Get()
  @ApiOperation({ summary: "List news items, newest first, optionally filtered by symbol." })
  async list(
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
    @Query("symbol") symbol?: string,
    @Query("status") status?: NewsExtractionStatus,
  ): Promise<{ items: NewsItemDto[]; total: number }> {
    const limit = clampInt(limitRaw, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = clampInt(offsetRaw, 0, 0, Number.MAX_SAFE_INTEGER);

    const { rows, total } = await this.newsRepo.findAndCountForList({
      extractionStatus: status ?? null,
      symbol: symbol ?? null,
      limit,
      offset,
    });

    return {
      items: rows
        .map((row) => toDto(row))
        .filter((dto) => {
          if (!symbol) return true;
          return dto.relatedSymbols.some((s) => s.toUpperCase() === symbol.toUpperCase());
        }),
      total,
    };
  }
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function toDto(row: NewsItem): NewsItemDto {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    source: row.source,
    summary: row.summary,
    relatedSymbols: row.relatedSymbols ?? [],
    relatedThemes: row.relatedThemes ?? [],
    sentiment: row.sentiment !== null ? Number(row.sentiment) : null,
    impactLevel: row.impactLevel,
    shortTermImplication: row.shortTermImplication,
    mediumTermImplication: row.mediumTermImplication,
    publishedAt: row.publishedAt !== null ? row.publishedAt.toISOString() : null,
    extractedAt: row.extractedAt !== null ? row.extractedAt.toISOString() : null,
    extractionStatus: row.extractionStatus,
    extractionError: row.extractionError,
  };
}
