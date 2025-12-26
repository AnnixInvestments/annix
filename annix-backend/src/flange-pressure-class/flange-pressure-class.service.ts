import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFlangePressureClassDto } from './dto/create-flange-pressure-class.dto';
import { UpdateFlangePressureClassDto } from './dto/update-flange-pressure-class.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FlangePressureClass } from './entities/flange-pressure-class.entity';
import { Repository } from 'typeorm';
import { FlangeStandard } from 'src/flange-standard/entities/flange-standard.entity';

@Injectable()
export class FlangePressureClassService {
  constructor(
    @InjectRepository(FlangePressureClass) private readonly pressureRepo: Repository<FlangePressureClass>,
    @InjectRepository(FlangeStandard) private readonly standardRepo: Repository<FlangeStandard>,
  ) {}

  async create(dto: CreateFlangePressureClassDto): Promise<FlangePressureClass> {
    const standard = await this.standardRepo.findOne({ where: { id: dto.standardId } });
    if (!standard) throw new NotFoundException(`Flange standard ${dto.standardId} not found`);

    const exists = await this.pressureRepo.findOne({ where: { designation: dto.designation, standard: { id: dto.standardId } } });
    if (exists) throw new BadRequestException('Pressure class already exists for this standard');

    const pressure = this.pressureRepo.create({ designation: dto.designation, standard });
    return this.pressureRepo.save(pressure);
  }

  async findAll(): Promise<FlangePressureClass[]> {
    return this.pressureRepo.find({ relations: ['standard'] });
  }

  async findOne(id: number): Promise<FlangePressureClass> {
    const pressure = await this.pressureRepo.findOne({ where: { id }, relations: ['standard'] });
    if (!pressure) throw new NotFoundException(`Flange pressure class ${id} not found`);
    return pressure;
  }

  async update(id: number, dto: UpdateFlangePressureClassDto): Promise<FlangePressureClass> {
    const pressure = await this.findOne(id);
    if (dto.designation) pressure.designation = dto.designation;
    return this.pressureRepo.save(pressure);
  }

  async remove(id: number): Promise<void> {
    const pressure = await this.findOne(id);
    await this.pressureRepo.remove(pressure);
  }

  async getAllByStandard(standardId: number): Promise<FlangePressureClass[]> {
    const standard = await this.standardRepo.findOne({ where: { id: standardId } });
    if (!standard) throw new NotFoundException(`Flange standard ${standardId} not found`);
    const classes = await this.pressureRepo.find({ where: { standard: { id: standardId } } });

    // Sort by numeric value extracted from designation
    // Handles formats like: "600/3", "1000/3", "PN10", "150", "Class 150", etc.
    return classes.sort((a, b) => {
      const getNumericValue = (designation: string): number => {
        // Extract first number from designation
        const match = designation?.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      return getNumericValue(a.designation) - getNumericValue(b.designation);
    });
  }
}
