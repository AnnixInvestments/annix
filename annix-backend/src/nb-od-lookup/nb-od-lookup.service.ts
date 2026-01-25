import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NbOdLookup } from './entities/nb-od-lookup.entity';

export interface NbOdLookupResult {
  found: boolean;
  nominalBoreMm: number;
  outsideDiameterMm: number;
  notes?: string;
}

@Injectable()
export class NbOdLookupService {
  constructor(
    @InjectRepository(NbOdLookup)
    private nbOdLookupRepository: Repository<NbOdLookup>,
  ) {}

  async findAll(): Promise<NbOdLookup[]> {
    return this.nbOdLookupRepository.find({
      order: { nominal_bore_mm: 'ASC' },
    });
  }

  async nbToOd(nominalBoreMm: number): Promise<NbOdLookupResult> {
    const result = await this.nbOdLookupRepository.findOne({
      where: { nominal_bore_mm: nominalBoreMm },
    });

    if (!result) {
      const estimatedOd = nominalBoreMm * 1.1;
      return {
        found: false,
        nominalBoreMm,
        outsideDiameterMm: estimatedOd,
        notes: `No data found for NB${nominalBoreMm}. Using estimate (NB x 1.1).`,
      };
    }

    return {
      found: true,
      nominalBoreMm,
      outsideDiameterMm: Number(result.outside_diameter_mm),
    };
  }

  async availableNominalBores(): Promise<number[]> {
    const result = await this.nbOdLookupRepository
      .createQueryBuilder('nb')
      .select('nb.nominal_bore_mm', 'nominalBoreMm')
      .orderBy('nb.nominal_bore_mm', 'ASC')
      .getRawMany<{ nominalBoreMm: number }>();

    return result.map((r) => r.nominalBoreMm);
  }
}
