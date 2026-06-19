import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { BotswanaMineRepository } from "./botswana-mine.repository";
import { MongoBotswanaMineRepository } from "./botswana-mine.repository.mongo";
import { CommodityRepository } from "./commodity.repository";
import { MongoCommodityRepository } from "./commodity.repository.mongo";
import { LiningCoatingRuleRepository } from "./lining-coating-rule.repository";
import { MongoLiningCoatingRuleRepository } from "./lining-coating-rule.repository.mongo";
import { MineRegistryService } from "./mine-registry.service";
import { MinesController } from "./mines.controller";
import { MinesService } from "./mines.service";
import { MozambiqueMineRepository } from "./mozambique-mine.repository";
import { MongoMozambiqueMineRepository } from "./mozambique-mine.repository.mongo";
import { NamibiaMineRepository } from "./namibia-mine.repository";
import { MongoNamibiaMineRepository } from "./namibia-mine.repository.mongo";
import { SaMineRepository } from "./sa-mine.repository";
import { MongoSaMineRepository } from "./sa-mine.repository.mongo";
import { BotswanaMineSchema } from "./schemas/botswana-mine.schema";
import { CommoditySchema } from "./schemas/commodity.schema";
import { LiningCoatingRuleSchema } from "./schemas/lining-coating-rule.schema";
import { MozambiqueMineSchema } from "./schemas/mozambique-mine.schema";
import { NamibiaMineSchema } from "./schemas/namibia-mine.schema";
import { SaMineSchema } from "./schemas/sa-mine.schema";
import { SlurryProfileSchema } from "./schemas/slurry-profile.schema";
import { ZambiaMineSchema } from "./schemas/zambia-mine.schema";
import { ZimbabweMineSchema } from "./schemas/zimbabwe-mine.schema";
import { SlurryProfileRepository } from "./slurry-profile.repository";
import { MongoSlurryProfileRepository } from "./slurry-profile.repository.mongo";
import { ZambiaMineRepository } from "./zambia-mine.repository";
import { MongoZambiaMineRepository } from "./zambia-mine.repository.mongo";
import { ZimbabweMineRepository } from "./zimbabwe-mine.repository";
import { MongoZimbabweMineRepository } from "./zimbabwe-mine.repository.mongo";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Commodity", schema: CommoditySchema },
      { name: "SaMine", schema: SaMineSchema },
      { name: "SlurryProfile", schema: SlurryProfileSchema },
      { name: "LiningCoatingRule", schema: LiningCoatingRuleSchema },
      { name: "BotswanaMine", schema: BotswanaMineSchema },
      { name: "NamibiaMine", schema: NamibiaMineSchema },
      { name: "ZimbabweMine", schema: ZimbabweMineSchema },
      { name: "ZambiaMine", schema: ZambiaMineSchema },
      { name: "MozambiqueMine", schema: MozambiqueMineSchema },
    ]),
  ],
  controllers: [MinesController],
  providers: [
    MinesService,
    MineRegistryService,
    repositoryProvider(CommodityRepository, MongoCommodityRepository),
    repositoryProvider(SaMineRepository, MongoSaMineRepository),
    repositoryProvider(SlurryProfileRepository, MongoSlurryProfileRepository),
    repositoryProvider(LiningCoatingRuleRepository, MongoLiningCoatingRuleRepository),
    repositoryProvider(BotswanaMineRepository, MongoBotswanaMineRepository),
    repositoryProvider(NamibiaMineRepository, MongoNamibiaMineRepository),
    repositoryProvider(ZimbabweMineRepository, MongoZimbabweMineRepository),
    repositoryProvider(ZambiaMineRepository, MongoZambiaMineRepository),
    repositoryProvider(MozambiqueMineRepository, MongoMozambiqueMineRepository),
  ],
  exports: [MinesService, MineRegistryService],
})
export class MinesModule {}
