import { Module } from '@nestjs/common';
import { SteelSpecificationService } from './steel-specification.service';
import { SteelSpecificationController } from './steel-specification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SteelSpecification } from './entities/steel-specification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SteelSpecification])],
  controllers: [SteelSpecificationController],
  providers: [SteelSpecificationService],
})
export class SteelSpecificationModule {}
