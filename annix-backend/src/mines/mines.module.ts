import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { BotswanaMineRepository } from "./botswana-mine.repository";
import { MongoBotswanaMineRepository } from "./botswana-mine.repository.mongo";
import { PostgresBotswanaMineRepository } from "./botswana-mine.repository.postgres";
import { CommodityRepository } from "./commodity.repository";
import { MongoCommodityRepository } from "./commodity.repository.mongo";
import { PostgresCommodityRepository } from "./commodity.repository.postgres";
import { BotswanaMine } from "./entities/botswana-mine.entity";
import { Commodity } from "./entities/commodity.entity";
import { LiningCoatingRule } from "./entities/lining-coating-rule.entity";
import { MozambiqueMine } from "./entities/mozambique-mine.entity";
import { NamibiaMine } from "./entities/namibia-mine.entity";
import { SaMine } from "./entities/sa-mine.entity";
import { SlurryProfile } from "./entities/slurry-profile.entity";
import { ZambiaMine } from "./entities/zambia-mine.entity";
import { ZimbabweMine } from "./entities/zimbabwe-mine.entity";
import { LiningCoatingRuleRepository } from "./lining-coating-rule.repository";
import { MongoLiningCoatingRuleRepository } from "./lining-coating-rule.repository.mongo";
import { PostgresLiningCoatingRuleRepository } from "./lining-coating-rule.repository.postgres";
import { MineRegistryService } from "./mine-registry.service";
import { MinesController } from "./mines.controller";
import { MinesService } from "./mines.service";
import { MozambiqueMineRepository } from "./mozambique-mine.repository";
import { MongoMozambiqueMineRepository } from "./mozambique-mine.repository.mongo";
import { PostgresMozambiqueMineRepository } from "./mozambique-mine.repository.postgres";
import { NamibiaMineRepository } from "./namibia-mine.repository";
import { MongoNamibiaMineRepository } from "./namibia-mine.repository.mongo";
import { PostgresNamibiaMineRepository } from "./namibia-mine.repository.postgres";
import { SaMineRepository } from "./sa-mine.repository";
import { MongoSaMineRepository } from "./sa-mine.repository.mongo";
import { PostgresSaMineRepository } from "./sa-mine.repository.postgres";
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
import { PostgresSlurryProfileRepository } from "./slurry-profile.repository.postgres";
import { ZambiaMineRepository } from "./zambia-mine.repository";
import { MongoZambiaMineRepository } from "./zambia-mine.repository.mongo";
import { PostgresZambiaMineRepository } from "./zambia-mine.repository.postgres";
import { ZimbabweMineRepository } from "./zimbabwe-mine.repository";
import { MongoZimbabweMineRepository } from "./zimbabwe-mine.repository.mongo";
import { PostgresZimbabweMineRepository } from "./zimbabwe-mine.repository.postgres";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
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
        ]),
  ],
  controllers: [MinesController],
  providers: [
    MinesService,
    MineRegistryService,
    repositoryProvider(CommodityRepository, PostgresCommodityRepository, MongoCommodityRepository),
    repositoryProvider(SaMineRepository, PostgresSaMineRepository, MongoSaMineRepository),
    repositoryProvider(
      SlurryProfileRepository,
      PostgresSlurryProfileRepository,
      MongoSlurryProfileRepository,
    ),
    repositoryProvider(
      LiningCoatingRuleRepository,
      PostgresLiningCoatingRuleRepository,
      MongoLiningCoatingRuleRepository,
    ),
    repositoryProvider(
      BotswanaMineRepository,
      PostgresBotswanaMineRepository,
      MongoBotswanaMineRepository,
    ),
    repositoryProvider(
      NamibiaMineRepository,
      PostgresNamibiaMineRepository,
      MongoNamibiaMineRepository,
    ),
    repositoryProvider(
      ZimbabweMineRepository,
      PostgresZimbabweMineRepository,
      MongoZimbabweMineRepository,
    ),
    repositoryProvider(
      ZambiaMineRepository,
      PostgresZambiaMineRepository,
      MongoZambiaMineRepository,
    ),
    repositoryProvider(
      MozambiqueMineRepository,
      PostgresMozambiqueMineRepository,
      MongoMozambiqueMineRepository,
    ),
  ],
  exports: [MinesService, MineRegistryService],
})
export class MinesModule {}
