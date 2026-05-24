import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NixModule } from "../../nix/nix.module";
import { AnnixSentinelRegulatoryUpdate } from "./entities/regulatory-update.entity";
import { AnnixSentinelRegulatoryController } from "./regulatory.controller";
import { AnnixSentinelRegulatoryService } from "./regulatory.service";

@Module({
  imports: [TypeOrmModule.forFeature([AnnixSentinelRegulatoryUpdate]), NixModule],
  controllers: [AnnixSentinelRegulatoryController],
  providers: [AnnixSentinelRegulatoryService],
})
export class AnnixSentinelRegulatoryModule {}
