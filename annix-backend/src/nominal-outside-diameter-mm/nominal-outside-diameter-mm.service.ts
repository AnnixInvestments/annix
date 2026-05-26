import { Injectable } from "@nestjs/common";
import { BaseCrudService } from "../lib/base-crud.service";
import { CreateNominalOutsideDiameterMmDto } from "./dto/create-nominal-outside-diameter-mm.dto";
import { UpdateNominalOutsideDiameterMmDto } from "./dto/update-nominal-outside-diameter-mm.dto";
import { NominalOutsideDiameterMm } from "./entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository";

@Injectable()
export class NominalOutsideDiameterMmService extends BaseCrudService<
  NominalOutsideDiameterMm,
  CreateNominalOutsideDiameterMmDto,
  UpdateNominalOutsideDiameterMmDto
> {
  private findAllCache: NominalOutsideDiameterMm[] | null = null;

  constructor(repository: NominalOutsideDiameterMmRepository) {
    super(repository, {
      entityName: "NominalOutsideDiameterMm",
      defaultRelations: ["pipeDimensions", "fittingBores"],
    });
  }

  private invalidateCache(): void {
    this.findAllCache = null;
  }

  async findAll(relations?: string[]): Promise<NominalOutsideDiameterMm[]> {
    if (!relations && this.findAllCache) {
      return this.findAllCache;
    }
    const result = await super.findAll(relations);
    if (!relations) {
      this.findAllCache = result;
    }
    return result;
  }

  async create(dto: CreateNominalOutsideDiameterMmDto): Promise<NominalOutsideDiameterMm> {
    await this.checkUnique(
      {
        nominal_diameter_mm: dto.nominal_diameter_mm,
        outside_diameter_mm: dto.outside_diameter_mm,
      },
      "This nominal + outside diameter combination already exists",
    );
    const created = await super.create(dto);
    this.invalidateCache();
    return created;
  }

  async update(
    id: number,
    dto: UpdateNominalOutsideDiameterMmDto,
  ): Promise<NominalOutsideDiameterMm> {
    const updated = await super.update(id, dto);
    this.invalidateCache();
    return updated;
  }

  async remove(id: number): Promise<void> {
    await super.remove(id);
    this.invalidateCache();
  }
}
