import { Injectable } from "@nestjs/common";
import { NbOdLookup } from "./entities/nb-od-lookup.entity";
import { NbOdLookupRepository } from "./nb-od-lookup.repository";

export interface NbOdLookupResult {
  found: boolean;
  nominalBoreMm: number;
  outsideDiameterMm: number;
  notes?: string;
}

@Injectable()
export class NbOdLookupService {
  constructor(private readonly nbOdLookupRepository: NbOdLookupRepository) {}

  findAll(): Promise<NbOdLookup[]> {
    return this.nbOdLookupRepository.findAllOrdered();
  }

  async nbToOd(nominalBoreMm: number): Promise<NbOdLookupResult> {
    const result = await this.nbOdLookupRepository.findByNominalBore(nominalBoreMm);

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
    const result = await this.nbOdLookupRepository.allNominalBores();
    return result.map((r) => r.nominalBoreMm);
  }
}
