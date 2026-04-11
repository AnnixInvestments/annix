import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { CreateNominalOutsideDiameterMmDto } from "./dto/create-nominal-outside-diameter-mm.dto";
import { UpdateNominalOutsideDiameterMmDto } from "./dto/update-nominal-outside-diameter-mm.dto";
import { NominalOutsideDiameterMm } from "./entities/nominal-outside-diameter-mm.entity";

@Injectable()
export class NominalOutsideDiameterMmService extends BaseCrudService<
  NominalOutsideDiameterMm,
  CreateNominalOutsideDiameterMmDto,
  UpdateNominalOutsideDiameterMmDto
> {
  constructor(
    @InjectRepository(NominalOutsideDiameterMm)
    nominalRepo: Repository<NominalOutsideDiameterMm>,
  ) {
    super(nominalRepo, {
      entityName: "NominalOutsideDiameterMm",
      defaultRelations: ["pipeDimensions", "fittingBores"],
    });
  }

  async create(dto: CreateNominalOutsideDiameterMmDto): Promise<NominalOutsideDiameterMm> {
    await this.checkUnique(
      {
        nominal_diameter_mm: dto.nominal_diameter_mm,
        outside_diameter_mm: dto.outside_diameter_mm,
      },
      "This nominal + outside diameter combination already exists",
    );
    return super.create(dto);
  }
}
