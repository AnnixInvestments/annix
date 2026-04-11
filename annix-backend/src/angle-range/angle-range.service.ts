import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { CreateAngleRangeDto } from "./dto/create-angle-range.dto";
import { UpdateAngleRangeDto } from "./dto/update-angle-range.dto";
import { AngleRange } from "./entities/angle-range.entity";

@Injectable()
export class AngleRangeService extends BaseCrudService<
  AngleRange,
  CreateAngleRangeDto,
  UpdateAngleRangeDto
> {
  constructor(
    @InjectRepository(AngleRange)
    rangeRepo: Repository<AngleRange>,
  ) {
    super(rangeRepo, { entityName: "AngleRange", defaultRelations: ["fittingDimensions"] });
  }

  async create(dto: CreateAngleRangeDto): Promise<AngleRange> {
    await this.checkUnique(
      { angle_min: dto.angle_min, angle_max: dto.angle_max },
      `AngleRange with min ${dto.angle_min}° and max ${dto.angle_max}° already exists`,
    );
    return super.create(dto);
  }
}
