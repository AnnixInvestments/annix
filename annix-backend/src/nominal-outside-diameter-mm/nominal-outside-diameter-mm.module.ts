import { Module } from '@nestjs/common';
import { NominalOutsideDiameterMmService } from './nominal-outside-diameter-mm.service';
import { NominalOutsideDiameterMmController } from './nominal-outside-diameter-mm.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NominalOutsideDiameterMm } from './entities/nominal-outside-diameter-mm.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NominalOutsideDiameterMm])],
  controllers: [NominalOutsideDiameterMmController],
  providers: [NominalOutsideDiameterMmService],
})
export class NominalOutsideDiameterMmModule {}
