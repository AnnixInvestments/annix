import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FlangeStandard } from "src/flange-standard/entities/flange-standard.entity";
import { Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { findOneOrFail } from "../lib/entity-helpers";
import { CreateFlangePressureClassDto } from "./dto/create-flange-pressure-class.dto";
import { UpdateFlangePressureClassDto } from "./dto/update-flange-pressure-class.dto";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";

@Injectable()
export class FlangePressureClassService extends BaseCrudService<
  FlangePressureClass,
  CreateFlangePressureClassDto,
  UpdateFlangePressureClassDto
> {
  private findAllCache: FlangePressureClass[] | null = null;
  private byStandardCache = new Map<number, FlangePressureClass[]>();

  constructor(
    @InjectRepository(FlangePressureClass)
    pressureRepo: Repository<FlangePressureClass>,
    @InjectRepository(FlangeStandard)
    private readonly standardRepo: Repository<FlangeStandard>,
  ) {
    super(pressureRepo, {
      entityName: "Flange pressure class",
      defaultRelations: ["standard"],
    });
  }

  private invalidateCache(): void {
    this.findAllCache = null;
    this.byStandardCache.clear();
  }

  async findAll(relations?: string[]): Promise<FlangePressureClass[]> {
    if (!relations && this.findAllCache) {
      return this.findAllCache;
    }
    const result = await super.findAll(relations);
    if (!relations) {
      this.findAllCache = result;
    }
    return result;
  }

  async create(dto: CreateFlangePressureClassDto): Promise<FlangePressureClass> {
    const standard = await findOneOrFail(
      this.standardRepo,
      { where: { id: dto.standardId } },
      "Flange standard",
    );

    await this.checkUnique(
      { designation: dto.designation, standard: { id: dto.standardId } },
      "Pressure class already exists for this standard",
    );

    const pressure = this.repo.create({
      designation: dto.designation,
      standard,
    });
    const saved = await this.repo.save(pressure);
    this.invalidateCache();
    return saved;
  }

  async update(id: number, dto: UpdateFlangePressureClassDto): Promise<FlangePressureClass> {
    const updated = await super.update(id, dto);
    this.invalidateCache();
    return updated;
  }

  async remove(id: number): Promise<void> {
    await super.remove(id);
    this.invalidateCache();
  }

  async getAllByStandard(standardId: number): Promise<FlangePressureClass[]> {
    const cached = this.byStandardCache.get(standardId);
    if (cached) {
      return cached;
    }

    await findOneOrFail(this.standardRepo, { where: { id: standardId } }, "Flange standard");
    const classes = await this.repo.find({
      where: { standard: { id: standardId } },
    });

    const sorted = classes.sort((a, b) => {
      const numericValue = (designation: string): number => {
        const match = designation?.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return numericValue(a.designation) - numericValue(b.designation);
    });

    this.byStandardCache.set(standardId, sorted);
    return sorted;
  }
}
