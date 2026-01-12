import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialValidationController } from './material-validation.controller';
import { MaterialValidationService } from './material-validation.service';
import { MaterialLimit } from './entities/material-limit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaterialLimit])],
  controllers: [MaterialValidationController],
  providers: [MaterialValidationService],
  exports: [MaterialValidationService],
})
export class MaterialValidationModule {}
