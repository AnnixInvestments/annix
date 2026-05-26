import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CvGeocodeCache } from "../entities/cv-geocode-cache.entity";
import { CvGeocodeCacheRepository } from "./cv-geocode-cache.repository";

@Injectable()
export class PostgresCvGeocodeCacheRepository implements CvGeocodeCacheRepository {
  constructor(
    @InjectRepository(CvGeocodeCache)
    private readonly repository: Repository<CvGeocodeCache>,
  ) {}

  findByAddress(address: string): Promise<CvGeocodeCache | null> {
    return this.repository.findOne({ where: { address } });
  }

  async upsert(entry: {
    address: string;
    lat: number;
    lon: number;
    provider: string;
  }): Promise<void> {
    await this.repository.save(this.repository.create(entry));
  }

  async clear(): Promise<void> {
    await this.repository.clear();
  }
}
