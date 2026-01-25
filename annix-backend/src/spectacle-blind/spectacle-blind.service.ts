import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpectacleBlind } from './entities/spectacle-blind.entity';

@Injectable()
export class SpectacleBlindService {
  constructor(
    @InjectRepository(SpectacleBlind)
    private readonly spectacleBlindRepository: Repository<SpectacleBlind>,
  ) {}

  findAll(): Promise<SpectacleBlind[]> {
    return this.spectacleBlindRepository.find({
      order: { pressureClass: 'ASC', nps: 'ASC' },
    });
  }

  findByPressureClass(pressureClass: string): Promise<SpectacleBlind[]> {
    return this.spectacleBlindRepository.find({
      where: { pressureClass },
      order: { nps: 'ASC' },
    });
  }

  findByNpsAndClass(
    nps: string,
    pressureClass: string,
  ): Promise<SpectacleBlind | null> {
    return this.spectacleBlindRepository.findOne({
      where: { nps, pressureClass },
    });
  }
}
