import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NbOdLookupController } from './nb-od-lookup.controller';
import { NbOdLookupService } from './nb-od-lookup.service';
import { NbOdLookup } from './entities/nb-od-lookup.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NbOdLookup])],
  controllers: [NbOdLookupController],
  providers: [NbOdLookupService],
  exports: [NbOdLookupService],
})
export class NbOdLookupModule {}
