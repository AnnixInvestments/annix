import { Module } from '@nestjs/common';
import { BoltMassService } from './bolt-mass.service';
import { BoltMassController } from './bolt-mass.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoltMass } from './entities/bolt-mass.entity';
import { Bolt } from 'src/bolt/entities/bolt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BoltMass, Bolt])],
  controllers: [BoltMassController],
  providers: [BoltMassService],
  exports: [BoltMassService],
})
export class BoltMassModule {}
