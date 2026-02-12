import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFlangeStandardDto } from './dto/create-flange-standard.dto';
import { UpdateFlangeStandardDto } from './dto/update-flange-standard.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FlangeStandard } from './entities/flange-standard.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FlangeStandardService {
  constructor(
    @InjectRepository(FlangeStandard) private readonly standardRepo: Repository<FlangeStandard>,
  ) {}

  async create(dto: CreateFlangeStandardDto): Promise<FlangeStandard> {
    const exists = await this.standardRepo.findOne({ where: { code: dto.code } });
    if (exists) throw new BadRequestException(`Flange standard ${dto.code} already exists`);

    const standard = this.standardRepo.create(dto);
    return this.standardRepo.save(standard);
  }

  async findAll(): Promise<FlangeStandard[]> {
    return this.standardRepo.find();
  }


  async findOne(id: number): Promise<FlangeStandard> {
    const standard = await this.standardRepo.findOne({ where: { id } });
    if (!standard) throw new NotFoundException(`Flange standard ${id} not found`);
    return standard;
  }

  async update(id: number, dto: UpdateFlangeStandardDto): Promise<FlangeStandard> {
    const standard = await this.findOne(id);
    if (dto.code) standard.code = dto.code;
    return this.standardRepo.save(standard);
  }

  async remove(id: number): Promise<void> {
    const standard = await this.findOne(id);
    await this.standardRepo.remove(standard);
  }
}
