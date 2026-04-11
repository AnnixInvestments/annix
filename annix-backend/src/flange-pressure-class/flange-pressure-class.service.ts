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
    return this.repo.save(pressure);
  }

  async getAllByStandard(standardId: number): Promise<FlangePressureClass[]> {
    await findOneOrFail(this.standardRepo, { where: { id: standardId } }, "Flange standard");
    const classes = await this.repo.find({
      where: { standard: { id: standardId } },
    });

    return classes.sort((a, b) => {
      const numericValue = (designation: string): number => {
        const match = designation?.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return numericValue(a.designation) - numericValue(b.designation);
    });
  }
}
