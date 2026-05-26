import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prospect } from "../entities/prospect.entity";
import { Territory, TerritoryBounds } from "../entities/territory.entity";
import { ProspectRepository } from "../prospect.repository";
import { TerritoryRepository } from "../territory.repository";

export interface CreateTerritoryDto {
  name: string;
  description?: string;
  provinces?: string[];
  cities?: string[];
  bounds?: TerritoryBounds;
}

export interface UpdateTerritoryDto {
  name?: string;
  description?: string;
  provinces?: string[];
  cities?: string[];
  bounds?: TerritoryBounds;
  isActive?: boolean;
}

export interface TerritoryWithProspectCount extends Territory {
  prospectCount?: number;
}

@Injectable()
export class TerritoryService {
  private readonly logger = new Logger(TerritoryService.name);

  constructor(
    private readonly territoryRepo: TerritoryRepository,
    private readonly prospectRepo: ProspectRepository,
  ) {}

  async create(orgId: number, dto: CreateTerritoryDto): Promise<Territory> {
    const saved = await this.territoryRepo.create({
      organizationId: orgId,
      name: dto.name,
      description: dto.description ?? null,
      provinces: dto.provinces ?? null,
      cities: dto.cities ?? null,
      bounds: dto.bounds ?? null,
      isActive: true,
    });
    this.logger.log(`Territory created: ${saved.name} for org ${orgId}`);
    return saved;
  }

  async findAll(orgId: number): Promise<TerritoryWithProspectCount[]> {
    const territories = await this.territoryRepo.findByOrganization(orgId);

    const result: TerritoryWithProspectCount[] = await Promise.all(
      territories.map(async (t) => {
        const prospectCount = await this.prospectRepo.countByTerritory(t.id);
        return { ...t, prospectCount };
      }),
    );

    return result;
  }

  async findOne(id: number): Promise<Territory | null> {
    return this.territoryRepo.findByIdWithRelations(id);
  }

  async update(id: number, dto: UpdateTerritoryDto): Promise<Territory> {
    const territory = await this.findOne(id);
    if (!territory) {
      throw new NotFoundException("Territory not found");
    }

    if (dto.name != null) {
      territory.name = dto.name;
    }
    if (dto.description != null) {
      territory.description = dto.description;
    }
    if (dto.provinces != null) {
      territory.provinces = dto.provinces;
    }
    if (dto.cities != null) {
      territory.cities = dto.cities;
    }
    if (dto.bounds != null) {
      territory.bounds = dto.bounds;
    }
    if (dto.isActive != null) {
      territory.isActive = dto.isActive;
    }

    return this.territoryRepo.save(territory);
  }

  async delete(id: number): Promise<void> {
    const territory = await this.findOne(id);
    if (!territory) {
      throw new NotFoundException("Territory not found");
    }

    await this.territoryRepo.remove(territory);
    this.logger.log(`Territory deleted: ${territory.name}`);
  }

  async assign(territoryId: number, userId: number | null): Promise<Territory> {
    const territory = await this.findOne(territoryId);
    if (!territory) {
      throw new NotFoundException("Territory not found");
    }

    territory.assignedToId = userId;
    const saved = await this.territoryRepo.save(territory);
    this.logger.log(`Territory ${territoryId} assigned to user ${userId}`);
    return saved;
  }

  async prospectsInTerritory(territoryId: number): Promise<Prospect[]> {
    return this.prospectRepo.findByTerritoryWithOwner(territoryId);
  }

  async findTerritoryForLocation(
    orgId: number,
    lat: number,
    lng: number,
  ): Promise<Territory | null> {
    const territories = await this.territoryRepo.findActiveByOrganization(orgId);

    const matching = territories.find((t) => {
      if (t.bounds) {
        return (
          lat <= t.bounds.north &&
          lat >= t.bounds.south &&
          lng <= t.bounds.east &&
          lng >= t.bounds.west
        );
      }
      return false;
    });

    return matching ?? null;
  }

  async territoriesForUser(userId: number): Promise<Territory[]> {
    return this.territoryRepo.findActiveByAssignedUser(userId);
  }
}
