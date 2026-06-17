export interface CachedJobAnalysis {
  category: string | null;
  skills: string[];
}

export abstract class JobAnalysisCacheRepository {
  abstract findByKey(key: string): Promise<CachedJobAnalysis | null>;
  abstract upsert(entry: { key: string; category: string | null; skills: string[] }): Promise<void>;
}
