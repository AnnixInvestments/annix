import { Module } from '@nestjs/common';
import { NutMassService } from './nut-mass.service';
import { NutMassController } from './nut-mass.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutMass } from './entities/nut-mass.entity';
import { Bolt } from 'src/bolt/entities/bolt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NutMass, Bolt])],
  controllers: [NutMassController],
  providers: [NutMassService],
  exports: [NutMassService],
})
export class NutMassModule {}
