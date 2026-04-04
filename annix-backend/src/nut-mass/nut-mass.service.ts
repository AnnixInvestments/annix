import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { Repository } from "typeorm";
import { findOneOrFail } from "../lib/entity-helpers";
import { CreateNutMassDto } from "./dto/create-nut-mass.dto";
import { UpdateNutMassDto } from "./dto/update-nut-mass.dto";
import { NutMass } from "./entities/nut-mass.entity";

@Injectable()
export class NutMassService {
  constructor(
    @InjectRepository(NutMass)
    private readonly nutMassRepo: Repository<NutMass>,
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
  ) {}

  async create(dto: CreateNutMassDto): Promise<NutMass> {
    const bolt = await findOneOrFail(this.boltRepo, { where: { id: dto.boltId } }, "Bolt");

    const exists = await this.nutMassRepo.findOne({
      where: { bolt: { id: dto.boltId }, mass_kg: dto.mass_kg },
    });
    if (exists) throw new BadRequestException("Nut mass already exists for this bolt");

    const nut = this.nutMassRepo.create({ bolt, mass_kg: dto.mass_kg });
    return this.nutMassRepo.save(nut);
  }

  async findAll(): Promise<NutMass[]> {
    return this.nutMassRepo.find({ relations: ["bolt"] });
  }

  async findOne(id: number): Promise<NutMass> {
    return findOneOrFail(this.nutMassRepo, { where: { id }, relations: ["bolt"] }, "Nut mass");
  }

  async update(id: number, dto: UpdateNutMassDto): Promise<NutMass> {
    const nut = await this.findOne(id);
    if (dto.mass_kg) nut.mass_kg = dto.mass_kg;
    return this.nutMassRepo.save(nut);
  }

  async remove(id: number): Promise<void> {
    const nut = await this.findOne(id);
    await this.nutMassRepo.remove(nut);
  }
}
