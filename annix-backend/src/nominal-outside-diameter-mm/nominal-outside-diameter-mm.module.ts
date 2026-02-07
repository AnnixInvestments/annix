import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NominalOutsideDiameterMm } from "./entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmController } from "./nominal-outside-diameter-mm.controller";
import { NominalOutsideDiameterMmService } from "./nominal-outside-diameter-mm.service";

@Module({
  imports: [TypeOrmModule.forFeature([NominalOutsideDiameterMm])],
  controllers: [NominalOutsideDiameterMmController],
  providers: [NominalOutsideDiameterMmService],
})
export class NominalOutsideDiameterMmModule {}
