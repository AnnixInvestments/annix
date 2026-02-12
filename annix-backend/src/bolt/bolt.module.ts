import { Module } from '@nestjs/common';
import { BoltService } from './bolt.service';
import { BoltController } from './bolt.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bolt } from './entities/bolt.entity';
import { BoltMass } from 'src/bolt-mass/entities/bolt-mass.entity';
import { NutMass } from 'src/nut-mass/entities/nut-mass.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bolt, BoltMass, NutMass])],
  controllers: [BoltController],
  providers: [BoltService],
  exports: [BoltService],
})
export class BoltModule {}
