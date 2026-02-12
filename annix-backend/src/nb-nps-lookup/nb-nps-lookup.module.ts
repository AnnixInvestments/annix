import { Module } from '@nestjs/common';
import { NbNpsLookupService } from './nb-nps-lookup.service';
import { NbNpsLookupController } from './nb-nps-lookup.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NbNpsLookup } from './entities/nb-nps-lookup.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NbNpsLookup])],
  controllers: [NbNpsLookupController],
  providers: [NbNpsLookupService],
  exports: [TypeOrmModule],
})
export class NbNpsLookupModule {}
