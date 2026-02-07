import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NbNpsLookup } from "./entities/nb-nps-lookup.entity";
import { NbNpsLookupController } from "./nb-nps-lookup.controller";
import { NbNpsLookupService } from "./nb-nps-lookup.service";

@Module({
  imports: [TypeOrmModule.forFeature([NbNpsLookup])],
  controllers: [NbNpsLookupController],
  providers: [NbNpsLookupService],
  exports: [TypeOrmModule],
})
export class NbNpsLookupModule {}
