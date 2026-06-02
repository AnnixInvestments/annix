import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StorageModule } from "../storage/storage.module";
import { AdminMarketingController } from "./admin-marketing.controller";
import { MarketingSiteContent } from "./entities/marketing-site-content.entity";
import { MarketingSiteContentService } from "./marketing-site-content.service";
import { PublicMarketingController } from "./public-marketing.controller";
import { MarketingSiteContentRepository } from "./repositories/marketing-site-content.repository";
import { MongoMarketingSiteContentRepository } from "./repositories/marketing-site-content.repository.mongo";
import { PostgresMarketingSiteContentRepository } from "./repositories/marketing-site-content.repository.postgres";
import { MarketingSiteContentSchema } from "./schemas/marketing-site-content.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "MarketingSiteContent", schema: MarketingSiteContentSchema },
          ]),
        ]
      : [TypeOrmModule.forFeature([MarketingSiteContent])]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    StorageModule,
    AdminModule,
    EmailModule,
  ],
  controllers: [AdminMarketingController, PublicMarketingController],
  providers: [
    MarketingSiteContentService,
    repositoryProvider(
      MarketingSiteContentRepository,
      PostgresMarketingSiteContentRepository,
      MongoMarketingSiteContentRepository,
    ),
  ],
  exports: [MarketingSiteContentService],
})
export class MarketingModule {}
