import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaRegulatoryUpdate } from "./entities/regulatory-update.entity";
import { ComplySaRegulatoryController } from "./regulatory.controller";
import { ComplySaRegulatoryService } from "./regulatory.service";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaRegulatoryUpdate])],
  controllers: [ComplySaRegulatoryController],
  providers: [ComplySaRegulatoryService],
})
export class ComplySaRegulatoryModule {}
