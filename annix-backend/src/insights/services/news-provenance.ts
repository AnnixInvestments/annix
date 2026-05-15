import type { NewsItem } from "../entities/news-item.entity";
import type { NewsProvenance } from "../entities/paper-trade.entity";

export function toNewsProvenance(item: NewsItem): NewsProvenance {
  const publishedAt = item.publishedAt !== null ? item.publishedAt.toISOString() : null;
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    source: item.source,
    publishedAt,
    sentiment: item.sentiment !== null ? Number(item.sentiment) : null,
    impactLevel: item.impactLevel,
    summary: item.summary,
    feedType: item.feedType,
  };
}

export function dedupeProvenance(rows: NewsProvenance[]): NewsProvenance[] {
  const seen = new Set<string>();
  const out: NewsProvenance[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}
