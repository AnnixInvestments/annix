import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateNutMassDto } from "./dto/create-nut-mass.dto";
import { UpdateNutMassDto } from "./dto/update-nut-mass.dto";
import { NutMass } from "./entities/nut-mass.entity";
import { NutMassRepository } from "./nut-mass.repository";

@Injectable()
export class NutMassService {
  constructor(private readonly nutMassRepository: NutMassRepository) {}

  async create(dto: CreateNutMassDto): Promise<NutMass> {
    const bolt = await this.nutMassRepository.findBolt(dto.boltId);
    if (!bolt) throw new NotFoundException("Bolt");

    const exists = await this.nutMassRepository.findExisting(dto.boltId, dto.mass_kg);
    if (exists) throw new BadRequestException("Nut mass already exists for this bolt");

    return this.nutMassRepository.createNut({ bolt, mass_kg: dto.mass_kg });
  }

  findAll(): Promise<NutMass[]> {
    return this.nutMassRepository.findAllWithBolt();
  }

  async findOne(id: number): Promise<NutMass> {
    const nut = await this.nutMassRepository.findOneWithBolt(id);
    if (!nut) throw new NotFoundException(`Nut mass ${id} not found`);
    return nut;
  }

  async update(id: number, dto: UpdateNutMassDto): Promise<NutMass> {
    const nut = await this.findOne(id);
    if (dto.mass_kg) nut.mass_kg = dto.mass_kg;
    return this.nutMassRepository.saveNut(nut);
  }

  async remove(id: number): Promise<void> {
    const nut = await this.findOne(id);
    await this.nutMassRepository.removeNut(nut);
  }
}
