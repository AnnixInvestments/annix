import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BotswanaMine } from "./entities/botswana-mine.entity";
import { Commodity } from "./entities/commodity.entity";
import { LiningCoatingRule } from "./entities/lining-coating-rule.entity";
import { MozambiqueMine } from "./entities/mozambique-mine.entity";
import { NamibiaMine } from "./entities/namibia-mine.entity";
import { SaMine } from "./entities/sa-mine.entity";
import { SlurryProfile } from "./entities/slurry-profile.entity";
import { ZambiaMine } from "./entities/zambia-mine.entity";
import { ZimbabweMine } from "./entities/zimbabwe-mine.entity";
import { MineRegistryService } from "./mine-registry.service";
import { MinesController } from "./mines.controller";
import { MinesService } from "./mines.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Commodity,
      SaMine,
      SlurryProfile,
      LiningCoatingRule,
      BotswanaMine,
      NamibiaMine,
      ZimbabweMine,
      ZambiaMine,
      MozambiqueMine,
    ]),
  ],
  controllers: [MinesController],
  providers: [MinesService, MineRegistryService],
  exports: [MinesService, MineRegistryService],
})
export class MinesModule {}
