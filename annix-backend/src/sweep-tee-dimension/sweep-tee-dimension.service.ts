import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SweepTeeDimension } from './entities/sweep-tee-dimension.entity';

@Injectable()
export class SweepTeeDimensionService {
  constructor(
    @InjectRepository(SweepTeeDimension)
    private sweepTeeDimensionRepository: Repository<SweepTeeDimension>,
  ) {}

  async findAll(): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionRepository.find({
      order: {
        nominalBoreMm: 'ASC',
        radiusType: 'ASC',
      },
    });
  }

  async findByNominalBore(nominalBoreMm: number): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionRepository.find({
      where: { nominalBoreMm },
      order: {
        radiusType: 'ASC',
      },
    });
  }

  async findByRadiusType(radiusType: string): Promise<SweepTeeDimension[]> {
    return this.sweepTeeDimensionRepository.find({
      where: { radiusType },
      order: {
        nominalBoreMm: 'ASC',
      },
    });
  }

  async findByCriteria(
    nominalBoreMm: number,
    radiusType: string,
  ): Promise<SweepTeeDimension | null> {
    return this.sweepTeeDimensionRepository.findOne({
      where: {
        nominalBoreMm,
        radiusType,
      },
    });
  }

  async availableNominalBores(): Promise<number[]> {
    const result = await this.sweepTeeDimensionRepository
      .createQueryBuilder('st')
      .select('DISTINCT st.nominalBoreMm', 'nominalBoreMm')
      .orderBy('st.nominalBoreMm', 'ASC')
      .getRawMany();

    return result.map((r) => r.nominalBoreMm);
  }

  async availableRadiusTypes(): Promise<string[]> {
    const result = await this.sweepTeeDimensionRepository
      .createQueryBuilder('st')
      .select('DISTINCT st.radiusType', 'radiusType')
      .getRawMany();

    return result.map((r) => r.radiusType).sort();
  }
}
