import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { CvGeocodeCache } from "../entities/cv-geocode-cache.entity";
import { CvGeocodeCacheRepository } from "./cv-geocode-cache.repository";

@Injectable()
export class MongoCvGeocodeCacheRepository implements CvGeocodeCacheRepository {
  constructor(
    @InjectModel("CvGeocodeCache")
    private readonly model: Model<Record<string, unknown>>,
  ) {}

  async findByAddress(address: string): Promise<CvGeocodeCache | null> {
    const doc = await this.model.findById(address).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { address: _id as string, ...rest } as unknown as CvGeocodeCache;
  }

  async upsert(entry: {
    address: string;
    lat: number;
    lon: number;
    provider: string;
  }): Promise<void> {
    await this.model
      .findByIdAndUpdate(
        entry.address,
        {
          $set: { lat: entry.lat, lon: entry.lon, provider: entry.provider },
          $setOnInsert: { _id: entry.address },
        },
        { upsert: true },
      )
      .exec();
  }

  async clear(): Promise<void> {
    await this.model.deleteMany({}).exec();
  }
}
