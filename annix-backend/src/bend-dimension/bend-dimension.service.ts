import { Injectable, NotFoundException } from "@nestjs/common";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";

@Injectable()
export class BendDimensionService {
  constructor(private readonly lookupRepo: NbNpsLookupRepository) {}

  async calculate(nbMm: number, degree: number, multiplier: number): Promise<number> {
    const lookup = await this.lookupRepo.findOneWhere({ nb_mm: nbMm });
    if (!lookup) {
      throw new NotFoundException(`NB ${nbMm} mm not found`);
    }

    // Center-to-Face formula: C-to-F = R × tan(angle/2)
    // where R is the bend radius (multiplier × NPS in mm)
    const halfAngleRadians = (degree / 2 / 180) * Math.PI;
    const radius = multiplier * lookup.nps_inch * 25.4;
    const result = Math.tan(halfAngleRadians) * radius;

    return Math.round(result * 10) / 10; // round to 1 decimal
  }
}
