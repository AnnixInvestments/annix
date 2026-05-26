import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateWeldTypeDto } from "./dto/create-weld-type.dto";
import { UpdateWeldTypeDto } from "./dto/update-weld-type.dto";
import { WeldType } from "./entities/weld-type.entity";
import { WeldTypeRepository } from "./weld-type.repository";

@Injectable()
export class WeldTypeService {
  constructor(private readonly weldTypeRepo: WeldTypeRepository) {}

  async create(dto: CreateWeldTypeDto): Promise<WeldType> {
    const exists = await this.weldTypeRepo.findByCode(dto.weld_code);
    if (exists) {
      throw new BadRequestException(`WeldType with code "${dto.weld_code}" already exists`);
    }

    return this.weldTypeRepo.create({
      weld_code: dto.weld_code,
      weld_name: dto.weld_name,
      category: dto.category,
      description: dto.description,
    });
  }

  async findAll(): Promise<WeldType[]> {
    return this.weldTypeRepo.findAll();
  }

  async findOne(id: number): Promise<WeldType> {
    const weldType = await this.weldTypeRepo.findById(id);
    if (!weldType) throw new NotFoundException(`WeldType ${id} not found`);
    return weldType;
  }

  async findByCode(weld_code: string): Promise<WeldType> {
    const weldType = await this.weldTypeRepo.findByCode(weld_code);
    if (!weldType) throw new NotFoundException(`WeldType with code "${weld_code}" not found`);
    return weldType;
  }

  async update(id: number, dto: UpdateWeldTypeDto): Promise<WeldType> {
    const weldType = await this.findOne(id);
    Object.assign(weldType, dto);
    return this.weldTypeRepo.save(weldType);
  }

  async remove(id: number): Promise<void> {
    const weldType = await this.findOne(id);
    await this.weldTypeRepo.remove(weldType);
  }
}
