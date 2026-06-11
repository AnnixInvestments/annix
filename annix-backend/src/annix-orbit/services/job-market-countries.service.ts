import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { now } from "../../lib/datetime";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";

export const ALL_JOB_COUNTRIES = ["za", "gb"] as const;
const ORBIT_SETTINGS_COLLECTION = "cv_assistant_orbit_settings";

type SettingsDoc = { _id: string; enabledJobCountries?: string[] };

@Injectable()
export class JobMarketCountriesService {
  constructor(@InjectConnection(ORBIT_CONNECTION) private readonly connection: Connection) {}

  async enabledCountries(): Promise<string[]> {
    const db = this.connection.db;
    if (!db) {
      return [...ALL_JOB_COUNTRIES];
    }
    const doc = await db
      .collection<SettingsDoc>(ORBIT_SETTINGS_COLLECTION)
      .findOne({ _id: "default" });
    const list = doc?.enabledJobCountries;
    if (!Array.isArray(list)) {
      return [...ALL_JOB_COUNTRIES];
    }
    return ALL_JOB_COUNTRIES.filter((code) => list.includes(code));
  }

  async setEnabledCountries(countries: string[]): Promise<string[]> {
    const cleaned = ALL_JOB_COUNTRIES.filter((code) => countries.includes(code));
    const db = this.connection.db;
    if (db) {
      await db
        .collection<SettingsDoc>(ORBIT_SETTINGS_COLLECTION)
        .updateOne(
          { _id: "default" },
          { $set: { enabledJobCountries: cleaned, updatedAt: now().toJSDate() } },
          { upsert: true },
        );
    }
    return cleaned;
  }
}
