import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlangeType } from './entities/flange-type.entity';

@Injectable()
export class FlangeTypeService {
  constructor(
    @InjectRepository(FlangeType)
    private readonly flangeTypeRepository: Repository<FlangeType>,
  ) {}

  findAll(): Promise<FlangeType[]> {
    return this.flangeTypeRepository.find({
      order: { code: 'ASC' },
    });
  }

  findByCode(code: string): Promise<FlangeType | null> {
    return this.flangeTypeRepository.findOne({ where: { code } });
  }

  findByAbbreviation(abbreviation: string): Promise<FlangeType | null> {
    return this.flangeTypeRepository.findOne({ where: { abbreviation } });
  }
}
