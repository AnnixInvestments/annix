import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { CreateNbNpsLookupDto } from "./dto/create-nb-nps-lookup.dto";
import { UpdateNbNpsLookupDto } from "./dto/update-nb-nps-lookup.dto";
import { NbNpsLookup } from "./entities/nb-nps-lookup.entity";

@Injectable()
export class NbNpsLookupService extends BaseCrudService<
  NbNpsLookup,
  CreateNbNpsLookupDto,
  UpdateNbNpsLookupDto
> {
  constructor(
    @InjectRepository(NbNpsLookup)
    repo: Repository<NbNpsLookup>,
  ) {
    super(repo, { entityName: "NbNpsLookup" });
  }

  async create(dto: CreateNbNpsLookupDto): Promise<NbNpsLookup> {
    await this.checkUnique(
      {
        nb_mm: dto.nb_mm,
        nps_inch: dto.nps_inch,
        outside_diameter_mm: dto.outside_diameter_mm,
      },
      `NbNpsLookup already exists for NB ${dto.nb_mm} mm / NPS ${dto.nps_inch}" / OD ${dto.outside_diameter_mm} mm`,
    );
    return super.create(dto);
  }

  async update(id: number, dto: UpdateNbNpsLookupDto): Promise<NbNpsLookup> {
    if (dto.nb_mm && dto.nps_inch && dto.outside_diameter_mm) {
      await this.checkUniqueExceptId(
        {
          nb_mm: dto.nb_mm,
          nps_inch: dto.nps_inch,
          outside_diameter_mm: dto.outside_diameter_mm,
        },
        id,
        `Another NbNpsLookup already exists with NB ${dto.nb_mm} mm / NPS ${dto.nps_inch}" / OD ${dto.outside_diameter_mm} mm`,
      );
    }
    return super.update(id, dto);
  }
}
