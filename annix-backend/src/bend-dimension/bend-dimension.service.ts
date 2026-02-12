import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NbNpsLookup } from 'src/nb-nps-lookup/entities/nb-nps-lookup.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BendDimensionService {
  constructor(
    @InjectRepository(NbNpsLookup)
    private readonly lookupRepo: Repository<NbNpsLookup>,
  ) {}    

  async calculate(nbMm: number, degree: number, multiplier: number): Promise<number> {
    const lookup = await this.lookupRepo.findOne({ where: { nb_mm: nbMm } });
    if (!lookup) {
      throw new NotFoundException(`NB ${nbMm} mm not found`);
    }

    // Center-to-Face formula: C-to-F = R × tan(angle/2)
    // where R is the bend radius (multiplier × NPS in mm)
    const halfAngleRadians = ((degree / 2) / 180) * Math.PI;
    const radius = multiplier * lookup.nps_inch * 25.4;
    const result = Math.tan(halfAngleRadians) * radius;

    return Math.round(result * 10) / 10; // round to 1 decimal
  }
}
