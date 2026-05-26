import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateWasherDto } from "./dto/create-washer.dto";
import { UpdateWasherDto } from "./dto/update-washer.dto";
import { Washer } from "./entities/washer.entity";
import { WasherFilters, WasherRepository } from "./washer.repository";

@Injectable()
export class WasherService {
  constructor(private readonly washerRepo: WasherRepository) {}

  async create(dto: CreateWasherDto): Promise<Washer> {
    const bolt = await this.washerRepo.findBoltById(dto.boltId);
    if (!bolt) throw new NotFoundException(`Bolt ${dto.boltId} not found`);

    return this.washerRepo.create({
      bolt,
      type: dto.type,
      material: dto.material || null,
      massKg: dto.massKg,
      odMm: dto.odMm || null,
      idMm: dto.idMm || null,
      thicknessMm: dto.thicknessMm || null,
    });
  }

  async findAll(filters?: WasherFilters): Promise<Washer[]> {
    return this.washerRepo.findAllFiltered(filters);
  }

  async findOne(id: number): Promise<Washer> {
    const washer = await this.washerRepo.findOneWithBolt(id);
    if (!washer) throw new NotFoundException(`Washer ${id} not found`);
    return washer;
  }

  async findByBoltDesignation(designation: string, type?: string): Promise<Washer[]> {
    return this.washerRepo.findByBoltDesignation(designation, type);
  }

  async update(id: number, dto: UpdateWasherDto): Promise<Washer> {
    const washer = await this.findOne(id);

    if (dto.boltId) {
      const bolt = await this.washerRepo.findBoltById(dto.boltId);
      if (!bolt) throw new NotFoundException(`Bolt ${dto.boltId} not found`);
      washer.bolt = bolt;
    }

    if (dto.type !== undefined) washer.type = dto.type;
    if (dto.material !== undefined) washer.material = dto.material || null;
    if (dto.massKg !== undefined) washer.massKg = dto.massKg;
    if (dto.odMm !== undefined) washer.odMm = dto.odMm || null;
    if (dto.idMm !== undefined) washer.idMm = dto.idMm || null;
    if (dto.thicknessMm !== undefined) washer.thicknessMm = dto.thicknessMm || null;

    return this.washerRepo.save(washer);
  }

  async remove(id: number): Promise<void> {
    const washer = await this.findOne(id);
    await this.washerRepo.remove(washer);
  }
}
