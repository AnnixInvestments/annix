import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipeEndConfiguration } from './entities/pipe-end-configuration.entity';
import { PipeEndConfigurationController } from './pipe-end-configuration.controller';
import { PipeEndConfigurationService } from './pipe-end-configuration.service';

@Module({
  imports: [TypeOrmModule.forFeature([PipeEndConfiguration])],
  controllers: [PipeEndConfigurationController],
  providers: [PipeEndConfigurationService],
  exports: [PipeEndConfigurationService],
})
export class PipeEndConfigurationModule {}