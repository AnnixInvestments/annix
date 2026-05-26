import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { memoryStorage } from "multer";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { DrawingRepository } from "./drawing.repository";
import { MongoDrawingRepository } from "./drawing.repository.mongo";
import { PostgresDrawingRepository } from "./drawing.repository.postgres";
import { DrawingAnalyzerService } from "./drawing-analyzer.service";
import { DrawingCommentRepository } from "./drawing-comment.repository";
import { MongoDrawingCommentRepository } from "./drawing-comment.repository.mongo";
import { PostgresDrawingCommentRepository } from "./drawing-comment.repository.postgres";
import { DrawingVersionRepository } from "./drawing-version.repository";
import { MongoDrawingVersionRepository } from "./drawing-version.repository.mongo";
import { PostgresDrawingVersionRepository } from "./drawing-version.repository.postgres";
import { DrawingsController } from "./drawings.controller";
import { DrawingsService } from "./drawings.service";
import { Drawing } from "./entities/drawing.entity";
import { DrawingComment } from "./entities/drawing-comment.entity";
import { DrawingVersion } from "./entities/drawing-version.entity";
import { DrawingSchema } from "./schemas/drawing.schema";
import { DrawingCommentSchema } from "./schemas/drawing-comment.schema";
import { DrawingVersionSchema } from "./schemas/drawing-version.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Drawing", schema: DrawingSchema },
            { name: "DrawingVersion", schema: DrawingVersionSchema },
            { name: "DrawingComment", schema: DrawingCommentSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([Drawing, DrawingVersion, DrawingComment])]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [DrawingsController],
  providers: [
    DrawingsService,
    DrawingAnalyzerService,
    repositoryProvider(DrawingRepository, PostgresDrawingRepository, MongoDrawingRepository),
    repositoryProvider(
      DrawingVersionRepository,
      PostgresDrawingVersionRepository,
      MongoDrawingVersionRepository,
    ),
    repositoryProvider(
      DrawingCommentRepository,
      PostgresDrawingCommentRepository,
      MongoDrawingCommentRepository,
    ),
  ],
  exports: [DrawingsService, DrawingAnalyzerService],
})
export class DrawingsModule {}
