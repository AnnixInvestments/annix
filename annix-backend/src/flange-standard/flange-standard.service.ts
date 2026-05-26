import { Injectable } from "@nestjs/common";
import { BaseCrudService } from "../lib/base-crud.service";
import { CreateFlangeStandardDto } from "./dto/create-flange-standard.dto";
import { UpdateFlangeStandardDto } from "./dto/update-flange-standard.dto";
import { FlangeStandard } from "./entities/flange-standard.entity";
import { FlangeStandardRepository } from "./flange-standard.repository";

@Injectable()
export class FlangeStandardService extends BaseCrudService<
  FlangeStandard,
  CreateFlangeStandardDto,
  UpdateFlangeStandardDto
> {
  constructor(repository: FlangeStandardRepository) {
    super(repository, { entityName: "Flange standard" });
  }

  async create(dto: CreateFlangeStandardDto): Promise<FlangeStandard> {
    await this.checkUnique({ code: dto.code }, `Flange standard ${dto.code} already exists`);
    return super.create(dto);
  }
}
