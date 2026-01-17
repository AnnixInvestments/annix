import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipeSteelWorkController } from './pipe-steel-work.controller';
import { PipeSteelWorkService } from './pipe-steel-work.service';
import { PipeSupportSpacing } from './entities/pipe-support-spacing.entity';
import { BracketTypeEntity } from './entities/bracket-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PipeSupportSpacing, BracketTypeEntity])],
  controllers: [PipeSteelWorkController],
  providers: [PipeSteelWorkService],
  exports: [PipeSteelWorkService],
})
export class PipeSteelWorkModule {}
