import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { CreateFittingTypeDto } from "./dto/create-fitting-type.dto";
import { UpdateFittingTypeDto } from "./dto/update-fitting-type.dto";
import { FittingType } from "./entities/fitting-type.entity";

@Injectable()
export class FittingTypeService extends BaseCrudService<
  FittingType,
  CreateFittingTypeDto,
  UpdateFittingTypeDto
> {
  constructor(
    @InjectRepository(FittingType)
    fittingTypeRepo: Repository<FittingType>,
  ) {
    super(fittingTypeRepo, { entityName: "FittingType", defaultRelations: ["fittings"] });
  }

  async create(dto: CreateFittingTypeDto): Promise<FittingType> {
    await this.checkUnique(
      { name: dto.name },
      `FittingType with name "${dto.name}" already exists`,
    );
    return super.create(dto);
  }

  async update(id: number, dto: UpdateFittingTypeDto): Promise<FittingType> {
    if (dto.name) {
      await this.checkUniqueExceptId(
        { name: dto.name },
        id,
        `FittingType with name "${dto.name}" already exists`,
      );
    }
    return super.update(id, dto);
  }
}
