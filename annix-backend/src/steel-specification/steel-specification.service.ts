import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateSteelSpecificationDto } from "./dto/create-steel-specification.dto";
import { UpdateSteelSpecificationDto } from "./dto/update-steel-specification.dto";
import { SteelSpecification } from "./entities/steel-specification.entity";
import { SteelSpecificationRepository } from "./steel-specification.repository";

@Injectable()
export class SteelSpecificationService {
  constructor(private readonly steelRepo: SteelSpecificationRepository) {}

  async create(dto: CreateSteelSpecificationDto): Promise<SteelSpecification> {
    const existing = await this.steelRepo.findByName(dto.steelSpecName);
    if (existing)
      throw new BadRequestException(`SteelSpecification "${dto.steelSpecName}" already exists`);

    return this.steelRepo.create(dto);
  }

  async findAll(): Promise<SteelSpecification[]> {
    return this.steelRepo.findAllWithRelations();
  }

  async findOne(id: number): Promise<SteelSpecification> {
    const spec = await this.steelRepo.findByIdWithRelations(id);
    if (!spec) throw new NotFoundException(`SteelSpecification ${id} not found`);
    return spec;
  }

  async update(id: number, dto: UpdateSteelSpecificationDto): Promise<SteelSpecification> {
    const spec = await this.findOne(id);
    if (dto.steelSpecName && dto.steelSpecName !== spec.steelSpecName) {
      const duplicate = await this.steelRepo.findByName(dto.steelSpecName);
      if (duplicate)
        throw new BadRequestException(`SteelSpecification "${dto.steelSpecName}" already exists`);
      spec.steelSpecName = dto.steelSpecName;
    }
    return this.steelRepo.save(spec);
  }

  async remove(id: number): Promise<void> {
    const spec = await this.findOne(id);
    await this.steelRepo.remove(spec);
  }
}
