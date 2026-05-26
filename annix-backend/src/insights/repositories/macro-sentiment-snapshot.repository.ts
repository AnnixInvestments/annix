import { CrudRepository } from "../../lib/persistence/crud-repository";
import { MacroSentimentSnapshot } from "../entities/macro-sentiment-snapshot.entity";

export abstract class MacroSentimentSnapshotRepository extends CrudRepository<MacroSentimentSnapshot> {
  abstract findByDate(snapshotDate: string): Promise<MacroSentimentSnapshot | null>;
  abstract deleteById(id: string): Promise<void>;
  abstract recentHistory(limit: number): Promise<MacroSentimentSnapshot[]>;
}
