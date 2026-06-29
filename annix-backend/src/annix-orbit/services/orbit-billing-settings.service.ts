import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { now } from "../../lib/datetime";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import {
  defaultOrbitBillingEnabled,
  isOrbitBillingModule,
  ORBIT_BILLING_MODULES,
  type OrbitBillingModule,
} from "../annix-orbit-billing.config";

const ORBIT_SETTINGS_COLLECTION = "cv_assistant_orbit_settings";

interface OrbitSettingsDoc {
  _id: string;
  billingEnabled?: Partial<Record<OrbitBillingModule, boolean>>;
  updatedAt?: Date;
}

export interface OrbitBillingModuleSetting {
  module: OrbitBillingModule;
  enabled: boolean;
  envDefault: boolean;
  persisted: boolean;
}

export interface OrbitBillingSettingsView {
  modules: OrbitBillingModuleSetting[];
}

@Injectable()
export class OrbitBillingSettingsService {
  constructor(@InjectConnection(ORBIT_CONNECTION) private readonly orbitConnection: Connection) {}

  async enabled(module: OrbitBillingModule): Promise<boolean> {
    const doc = await this.settingsDoc();
    const persisted = doc?.billingEnabled?.[module];
    return persisted ?? defaultOrbitBillingEnabled(module);
  }

  async settings(): Promise<OrbitBillingSettingsView> {
    const doc = await this.settingsDoc();
    const billingEnabled = doc?.billingEnabled ?? {};
    return {
      modules: ORBIT_BILLING_MODULES.map((module) => {
        const persistedValue = billingEnabled[module];
        return {
          module,
          enabled: persistedValue ?? defaultOrbitBillingEnabled(module),
          envDefault: defaultOrbitBillingEnabled(module),
          persisted: persistedValue !== undefined,
        };
      }),
    };
  }

  async setEnabled(moduleValue: string, enabled: boolean): Promise<OrbitBillingSettingsView> {
    if (!isOrbitBillingModule(moduleValue)) {
      throw new BadRequestException(`Unknown Orbit billing module: ${moduleValue}`);
    }
    const db = this.orbitConnection.db;
    if (!db) {
      return this.settings();
    }
    await db.collection<OrbitSettingsDoc>(ORBIT_SETTINGS_COLLECTION).updateOne(
      { _id: "default" },
      {
        $set: {
          [`billingEnabled.${moduleValue}`]: enabled,
          updatedAt: now().toJSDate(),
        },
      },
      { upsert: true },
    );
    return this.settings();
  }

  private async settingsDoc(): Promise<OrbitSettingsDoc | null> {
    const db = this.orbitConnection.db;
    if (!db) return null;
    return db.collection<OrbitSettingsDoc>(ORBIT_SETTINGS_COLLECTION).findOne({ _id: "default" });
  }
}
