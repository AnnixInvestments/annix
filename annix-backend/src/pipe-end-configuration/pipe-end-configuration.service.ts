import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipeEndConfiguration } from './entities/pipe-end-configuration.entity';

@Injectable()
export class PipeEndConfigurationService {
  constructor(
    @InjectRepository(PipeEndConfiguration)
    private pipeEndConfigurationRepository: Repository<PipeEndConfiguration>,
  ) {}

  async findAll(): Promise<PipeEndConfiguration[]> {
    return this.pipeEndConfigurationRepository.find({
      relations: ['weldType'],
    });
  }

  async findByCode(configCode: string): Promise<PipeEndConfiguration | null> {
    return this.pipeEndConfigurationRepository.findOne({
      where: { config_code: configCode },
      relations: ['weldType'],
    });
  }

  async getWeldCountForConfig(configCode: string): Promise<number> {
    const config = await this.findByCode(configCode);
    return config?.weld_count || 0;
  }
}