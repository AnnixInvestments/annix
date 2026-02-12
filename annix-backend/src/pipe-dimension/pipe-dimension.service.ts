// import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { PipeDimension } from './entities/pipe-dimension.entity';
// import { NominalOutsideDiameterMm } from '../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
// import { IsNull } from 'typeorm';
// import { CreatePipeDimensionDto } from './dto/create-pipe-dimension.dto';
// import { UpdatePipeDimensionDto } from './dto/update-pipe-dimension.dto';

// @Injectable()
// export class PipeDimensionService {
//   constructor(
//     @InjectRepository(PipeDimension)
//     private readonly pipeDimensionRepo: Repository<PipeDimension>,

//     @InjectRepository(NominalOutsideDiameterMm)
//     private readonly nominalRepo: Repository<NominalOutsideDiameterMm>,
//   ) {}

//   async create(nominalId: number, createPipeDimensionDto: CreatePipeDimensionDto,
//   ): Promise<PipeDimension> {
//     const nominal = await this.nominalRepo.findOne({ where: { id: nominalId } });
//     if (!nominal) {
//       throw new NotFoundException(
//         `NominalOutsideDiameterMm with id ${nominalId} not found`,
//       );
//     }

//     const exists = await this.pipeDimensionRepo.findOne({
//       where: {
//         nominalOutsideDiameter: { id: nominalId },
//         wall_thickness_mm: createPipeDimensionDto.wall_thickness_mm,
//         internal_diameter_mm:
//           createPipeDimensionDto.internal_diameter_mm === null ? IsNull() : createPipeDimensionDto.internal_diameter_mm,
//         mass_kgm: createPipeDimensionDto.mass_kgm,
//         schedule_designation:
//           createPipeDimensionDto.schedule_designation === null ? IsNull() : createPipeDimensionDto.schedule_designation,
//         schedule_number:
//           createPipeDimensionDto.schedule_number === null ? IsNull() : createPipeDimensionDto.schedule_number,
//       },
//       relations: ['nominalOutsideDiameter'],
//     });

//     if (exists) {
//       throw new BadRequestException(
//         `PipeDimension with wall thickness ${createPipeDimensionDto.wall_thickness_mm} mm, ` +
//           `internal diameter ${createPipeDimensionDto.internal_diameter_mm ?? 'null'} mm, ` +
//           `mass ${createPipeDimensionDto.mass_kgm} kg/m, ` +
//           `schedule ${createPipeDimensionDto.schedule_designation ?? 'null'} ${
//             createPipeDimensionDto.schedule_number ?? ''
//           } already exists for NominalOutsideDiameterMm ID ${nominalId}`,
//       );
//     }

//     const dimension = this.pipeDimensionRepo.create({
//       ...createPipeDimensionDto,
//       nominalOutsideDiameter: nominal,
//     });

//     return this.pipeDimensionRepo.save(dimension);
//   }


//   async findAll(): Promise<PipeDimension[]> {
//     return this.pipeDimensionRepo.find({relations: ['nominalOutsideDiameter'],});
//   }

//   async findOne(id: number): Promise<PipeDimension> {
//     const dimension = await this.pipeDimensionRepo.findOne({
//       where: { id },
//       relations: ['nominalOutsideDiameter'],
//     });
//     if (!dimension) {
//       throw new NotFoundException(`PipeDimension with id ${id} not found`);
//     }
//     return dimension;
//   }

//   async update(id: number, updatePipeDimensionDto: UpdatePipeDimensionDto): Promise<PipeDimension> {
//     const dimension = await this.findOne(id);

//     if (
//       updatePipeDimensionDto.wall_thickness_mm !== undefined &&
//       updatePipeDimensionDto.mass_kgm !== undefined
//     ) {
//       const exists = await this.pipeDimensionRepo.findOne({
//         where: {
//           nominalOutsideDiameter: { id: dimension.nominalOutsideDiameter.id },
//           wall_thickness_mm: updatePipeDimensionDto.wall_thickness_mm,
//           internal_diameter_mm:
//             updatePipeDimensionDto.internal_diameter_mm === undefined
//               ? dimension.internal_diameter_mm ?? IsNull()
//               : updatePipeDimensionDto.internal_diameter_mm === null
//               ? IsNull()
//               : updatePipeDimensionDto.internal_diameter_mm,
//           mass_kgm: updatePipeDimensionDto.mass_kgm,
//           schedule_designation:
//             updatePipeDimensionDto.schedule_designation === undefined
//               ? dimension.schedule_designation ?? IsNull()
//               : updatePipeDimensionDto.schedule_designation === null
//               ? IsNull()
//               : updatePipeDimensionDto.schedule_designation,
//           schedule_number:
//             updatePipeDimensionDto.schedule_number === undefined
//               ? dimension.schedule_number ?? IsNull()
//               : updatePipeDimensionDto.schedule_number === null
//               ? IsNull()
//               : updatePipeDimensionDto.schedule_number,
//         },
//         relations: ['nominalOutsideDiameter'],
//       });

//       if (exists && exists.id !== id) {
//         throw new BadRequestException(
//           `PipeDimension with wall thickness ${updatePipeDimensionDto.wall_thickness_mm ?? dimension.wall_thickness_mm} mm, ` +
//             `internal diameter ${
//               updatePipeDimensionDto.internal_diameter_mm ?? dimension.internal_diameter_mm ?? 'null'
//             } mm, ` +
//             `mass ${updatePipeDimensionDto.mass_kgm ?? dimension.mass_kgm} kg/m, ` +
//             `schedule ${updatePipeDimensionDto.schedule_designation ?? dimension.schedule_designation ?? 'null'} ` +
//             `${updatePipeDimensionDto.schedule_number ?? dimension.schedule_number ?? ''} ` +
//             `already exists for NominalOutsideDiameterMm ID ${dimension.nominalOutsideDiameter.id}`,
//         );
//       }
//     }

//     Object.assign(dimension, updatePipeDimensionDto);
//     return this.pipeDimensionRepo.save(dimension);
//   }

//   async remove(id: number): Promise<void> {
//     const result = await this.pipeDimensionRepo.delete(id);
//     if (result.affected === 0) 
//       throw new NotFoundException(`PipeDimension #${id} not found`);
//   }
// }

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PipeDimension } from './entities/pipe-dimension.entity';
import { CreatePipeDimensionDto } from './dto/create-pipe-dimension.dto';
import { UpdatePipeDimensionDto } from './dto/update-pipe-dimension.dto';
import { NominalOutsideDiameterMm } from 'src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { SteelSpecification } from 'src/steel-specification/entities/steel-specification.entity';

@Injectable()
export class PipeDimensionService {
  constructor(
    @InjectRepository(PipeDimension)
    private readonly pipeRepo: Repository<PipeDimension>,
    @InjectRepository(NominalOutsideDiameterMm)
    private readonly nominalRepo: Repository<NominalOutsideDiameterMm>,
    @InjectRepository(SteelSpecification)
    private readonly steelRepo: Repository<SteelSpecification>,
  ) {}

  async create(dto: CreatePipeDimensionDto): Promise<PipeDimension> {
    const nominal = await this.nominalRepo.findOne({ where: { id: dto.nominalOutsideDiameterId } });
    if (!nominal) throw new NotFoundException(`NominalOutsideDiameter ${dto.nominalOutsideDiameterId} not found`);

    const steel = await this.steelRepo.findOne({ where: { id: dto.steelSpecificationId } });
    if (!steel) throw new NotFoundException(`SteelSpecification ${dto.steelSpecificationId} not found`);

    const pipe = this.pipeRepo.create({ nominalOutsideDiameter: nominal, steelSpecification: steel, ...dto });
    return this.pipeRepo.save(pipe);
  }

  async findAll(): Promise<PipeDimension[]> {
    return this.pipeRepo.find({ relations: ['nominalOutsideDiameter', 'steelSpecification', 'pressures'] });
  }

  async findOne(id: number): Promise<PipeDimension> {
    const pipe = await this.pipeRepo.findOne({ where: { id }, relations: ['nominalOutsideDiameter', 'steelSpecification', 'pressures'] });
    if (!pipe) throw new NotFoundException(`PipeDimension ${id} not found`);
    return pipe;
  }

  async update(id: number, dto: UpdatePipeDimensionDto): Promise<PipeDimension> {
    const pipe = await this.findOne(id);
    Object.assign(pipe, dto);
    return this.pipeRepo.save(pipe);
  }

  async remove(id: number): Promise<void> {
    const pipe = await this.findOne(id);
    await this.pipeRepo.remove(pipe);
  }

  async getRecommendedSpecs(
    nominalBore: number,
    workingPressure: number,
    temperature: number = 20,
    steelSpecId?: number
  ): Promise<{
    pipeDimension: PipeDimension;
    schedule?: string;
    wallThickness: number;
    maxPressure: number;
    availableUpgrades?: PipeDimension[];
  }> {
    // Find nominal outside diameter that matches the bore
    const nominal = await this.nominalRepo.findOne({ 
      where: { nominal_diameter_mm: nominalBore } 
    });
    
    if (!nominal) {
      throw new NotFoundException(`No pipe dimensions found for ${nominalBore}mm nominal bore`);
    }

    // Working pressure is already in MPa (converted by frontend)
    const workingPressureMpa = workingPressure;

    // Build query to find pipe dimensions
    let query = this.pipeRepo
      .createQueryBuilder('pipe')
      .leftJoinAndSelect('pipe.nominalOutsideDiameter', 'nominal')
      .leftJoinAndSelect('pipe.steelSpecification', 'steel')
      .leftJoinAndSelect('pipe.pressures', 'pressure')
      .where('nominal.id = :nominalId', { nominalId: nominal.id });

    // Filter by steel specification if provided
    if (steelSpecId) {
      query = query.andWhere('steel.id = :steelSpecId', { steelSpecId });
    }

    // Filter by pressure rating - find pipes with adequate pressure rating
    // The pressure rating should be at or above the working pressure at the specified temperature
    query = query
      .andWhere('pressure.temperature_c IS NOT NULL')
      .andWhere('pressure.temperature_c >= :temperature', { temperature })
      .andWhere('pressure.max_working_pressure_mpa IS NOT NULL')
      .andWhere('pressure.max_working_pressure_mpa >= :workingPressureMpa', { workingPressureMpa });

    const suitablePipes = await query.getMany();
    
    if (suitablePipes.length === 0) {
      throw new NotFoundException(
        `No suitable pipe dimensions found for ${nominalBore}mm NB at ${workingPressure} bar and ${temperature}°C`
      );
    }

    // Sort by schedule preference to get the most economical option first
    // Priority: STD (Sch40) > Sch80 > Sch120 > Sch160 > others
    const sortedPipes = suitablePipes.sort((a, b) => {
      const getSchedulePriority = (pipe: PipeDimension): number => {
        // STD or Sch40 is the most common and economical
        if (pipe.schedule_designation === 'STD' || pipe.schedule_number === 40) return 1;
        if (pipe.schedule_number === 80 || pipe.schedule_designation === 'XS') return 2;
        if (pipe.schedule_number === 120) return 3;
        if (pipe.schedule_number === 160 || pipe.schedule_designation === 'XXS') return 4;
        if (pipe.schedule_number) return pipe.schedule_number;
        // For pipes without schedule numbers, sort by wall thickness
        return 100 + (pipe.wall_thickness_mm * 10);
      };
      
      return getSchedulePriority(a) - getSchedulePriority(b);
    });

    // The recommended pipe is the first one (minimum acceptable schedule)
    const recommendedPipe = sortedPipes[0];
    
    // Find all higher schedules available for potential upgrade
    const recommendedScheduleNum = this.getScheduleNumber(recommendedPipe);
    const availableUpgrades = sortedPipes.filter(pipe => {
      const pipeScheduleNum = this.getScheduleNumber(pipe);
      return pipeScheduleNum > recommendedScheduleNum;
    });

    // Get the pressure rating for the recommended pipe at the specified temperature
    const suitablePressure = recommendedPipe.pressures
      .filter(p => p.temperature_c !== null && p.temperature_c >= temperature)
      .sort((a, b) => (a.temperature_c || 0) - (b.temperature_c || 0))[0];

    const schedule = recommendedPipe.schedule_designation || 
                    (recommendedPipe.schedule_number ? `Sch${recommendedPipe.schedule_number}` : 'STD');

    return {
      pipeDimension: recommendedPipe,
      schedule,
      wallThickness: recommendedPipe.wall_thickness_mm,
      maxPressure: (suitablePressure?.max_working_pressure_mpa || 0) * 10, // Convert MPa to bar
      availableUpgrades
    };
  }

  // Helper method to get numeric schedule value for comparison
  private getScheduleNumber(pipe: PipeDimension): number {
    if (pipe.schedule_number) return pipe.schedule_number;
    if (pipe.schedule_designation === 'STD') return 40;
    if (pipe.schedule_designation === 'XS') return 80;
    if (pipe.schedule_designation === 'XXS') return 160;
    // For pipes without standard schedules, use wall thickness * 10 as proxy
    return pipe.wall_thickness_mm * 10;
  }

  // New method to get all valid higher schedules for manual override
  async getHigherSchedules(
    nominalBore: number,
    currentWallThickness: number,
    workingPressure: number,
    temperature: number = 20,
    steelSpecId?: number
  ): Promise<PipeDimension[]> {
    const nominal = await this.nominalRepo.findOne({ 
      where: { nominal_diameter_mm: nominalBore } 
    });
    
    if (!nominal) {
      throw new NotFoundException(`No pipe dimensions found for ${nominalBore}mm nominal bore`);
    }

    const workingPressureMpa = workingPressure;

    let query = this.pipeRepo
      .createQueryBuilder('pipe')
      .leftJoinAndSelect('pipe.nominalOutsideDiameter', 'nominal')
      .leftJoinAndSelect('pipe.steelSpecification', 'steel')
      .leftJoinAndSelect('pipe.pressures', 'pressure')
      .where('nominal.id = :nominalId', { nominalId: nominal.id })
      .andWhere('pipe.wall_thickness_mm > :currentWallThickness', { currentWallThickness })
      .andWhere('pressure.temperature_c IS NOT NULL')
      .andWhere('pressure.temperature_c >= :temperature', { temperature })
      .andWhere('pressure.max_working_pressure_mpa IS NOT NULL')
      .andWhere('pressure.max_working_pressure_mpa >= :workingPressureMpa', { workingPressureMpa });

    if (steelSpecId) {
      query = query.andWhere('steel.id = :steelSpecId', { steelSpecId });
    }

    const higherSchedules = await query.getMany();
    
    // Sort by wall thickness ascending (show closest upgrades first)
    return higherSchedules.sort((a, b) => a.wall_thickness_mm - b.wall_thickness_mm);
  }

  async findAllBySpecAndNominal(steelSpecId: number, nominalId: number): Promise<PipeDimension[]> {
    const pipes = await this.pipeRepo.find({
      where: {
        steelSpecification: { id: steelSpecId },
        nominalOutsideDiameter: { id: nominalId },
      },
      relations: ['nominalOutsideDiameter', 'steelSpecification', 'pressures'],
      order: {
        wall_thickness_mm: 'ASC',
      },
    });
    return pipes;
  }
}
