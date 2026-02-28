import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RubberStockLocation } from "./entities/rubber-stock-location.entity";

export interface StockLocationDto {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RubberStockLocationService {
  constructor(
    @InjectRepository(RubberStockLocation)
    private readonly locationRepo: Repository<RubberStockLocation>,
  ) {}

  async allLocations(includeInactive = false): Promise<StockLocationDto[]> {
    const queryBuilder = this.locationRepo
      .createQueryBuilder("location")
      .orderBy("location.displayOrder", "ASC")
      .addOrderBy("location.name", "ASC");

    if (!includeInactive) {
      queryBuilder.andWhere("location.active = :active", { active: true });
    }

    const locations = await queryBuilder.getMany();
    return locations.map((loc) => this.toDto(loc));
  }

  async locationById(id: number): Promise<StockLocationDto> {
    const location = await this.locationRepo.findOne({ where: { id } });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    return this.toDto(location);
  }

  async createLocation(data: {
    name: string;
    description?: string;
    displayOrder?: number;
  }): Promise<StockLocationDto> {
    const location = this.locationRepo.create({
      name: data.name,
      description: data.description || null,
      displayOrder: data.displayOrder ?? 0,
      active: true,
    });

    const saved = await this.locationRepo.save(location);
    return this.toDto(saved);
  }

  async updateLocation(
    id: number,
    data: {
      name?: string;
      description?: string;
      displayOrder?: number;
      active?: boolean;
    },
  ): Promise<StockLocationDto> {
    const location = await this.locationRepo.findOne({ where: { id } });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    if (data.name !== undefined) location.name = data.name;
    if (data.description !== undefined) location.description = data.description;
    if (data.displayOrder !== undefined) location.displayOrder = data.displayOrder;
    if (data.active !== undefined) location.active = data.active;

    const saved = await this.locationRepo.save(location);
    return this.toDto(saved);
  }

  async deleteLocation(id: number): Promise<void> {
    const location = await this.locationRepo.findOne({ where: { id } });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    await this.locationRepo.remove(location);
  }

  private toDto(location: RubberStockLocation): StockLocationDto {
    return {
      id: location.id,
      name: location.name,
      description: location.description,
      displayOrder: location.displayOrder,
      active: location.active,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }
}
