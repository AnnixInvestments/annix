import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaRegulatoryUpdate } from "./entities/regulatory-update.entity";

@Injectable()
export class ComplySaRegulatoryService {
  constructor(
    @InjectRepository(ComplySaRegulatoryUpdate)
    private readonly regulatoryUpdateRepository: Repository<ComplySaRegulatoryUpdate>,
  ) {}

  async recentUpdates(limit: number): Promise<ComplySaRegulatoryUpdate[]> {
    return this.regulatoryUpdateRepository.find({
      order: { publishedAt: "DESC" },
      take: limit,
    });
  }

  async updatesByCategory(category: string): Promise<ComplySaRegulatoryUpdate[]> {
    return this.regulatoryUpdateRepository.find({
      where: { category },
      order: { publishedAt: "DESC" },
    });
  }

  async createUpdate(data: Partial<ComplySaRegulatoryUpdate>): Promise<ComplySaRegulatoryUpdate> {
    const update = this.regulatoryUpdateRepository.create(data);
    return this.regulatoryUpdateRepository.save(update);
  }
}
