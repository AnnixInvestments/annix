import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoatingStandard } from './entities/coating-standard.entity';
import { CoatingEnvironment } from './entities/coating-environment.entity';
import { CoatingSpecification } from './entities/coating-specification.entity';
import { CoatingSpecificationService } from './coating-specification.service';
import { CoatingSpecificationController } from './coating-specification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CoatingStandard, CoatingEnvironment, CoatingSpecification])],
  controllers: [CoatingSpecificationController],
  providers: [CoatingSpecificationService],
  exports: [CoatingSpecificationService],
})
export class CoatingSpecificationModule {}
