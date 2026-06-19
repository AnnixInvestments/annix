import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { DrawingRepository } from "./drawing.repository";
import { MongoDrawingRepository } from "./drawing.repository.mongo";
import { DrawingAnalyzerService } from "./drawing-analyzer.service";
import { DrawingCommentRepository } from "./drawing-comment.repository";
import { MongoDrawingCommentRepository } from "./drawing-comment.repository.mongo";
import { DrawingVersionRepository } from "./drawing-version.repository";
import { MongoDrawingVersionRepository } from "./drawing-version.repository.mongo";
import { DrawingsController } from "./drawings.controller";
import { DrawingsService } from "./drawings.service";
import { DrawingSchema } from "./schemas/drawing.schema";
import { DrawingCommentSchema } from "./schemas/drawing-comment.schema";
import { DrawingVersionSchema } from "./schemas/drawing-version.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Drawing", schema: DrawingSchema },
      { name: "DrawingVersion", schema: DrawingVersionSchema },
      { name: "DrawingComment", schema: DrawingCommentSchema },
    ]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [DrawingsController],
  providers: [
    DrawingsService,
    DrawingAnalyzerService,
    repositoryProvider(DrawingRepository, MongoDrawingRepository),
    repositoryProvider(DrawingVersionRepository, MongoDrawingVersionRepository),
    repositoryProvider(DrawingCommentRepository, MongoDrawingCommentRepository),
  ],
  exports: [DrawingsService, DrawingAnalyzerService],
})
export class DrawingsModule {}
