import { Module } from '@nestjs/common';
import { BoltService } from './bolt.service';
import { BoltController } from './bolt.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bolt } from './entities/bolt.entity';
import { BoltMass } from 'src/bolt-mass/entities/bolt-mass.entity';
import { NutMass } from 'src/nut-mass/entities/nut-mass.entity';
import { UBoltEntity } from './entities/u-bolt.entity';
import { PipeClampEntity } from './entities/pipe-clamp.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bolt,
      BoltMass,
      NutMass,
      UBoltEntity,
      PipeClampEntity,
    ]),
  ],
  controllers: [BoltController],
  providers: [BoltService],
  exports: [BoltService],
})
export class BoltModule {}
