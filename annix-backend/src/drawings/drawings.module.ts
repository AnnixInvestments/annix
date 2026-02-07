import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { memoryStorage } from "multer";
import { DrawingAnalyzerService } from "./drawing-analyzer.service";
import { DrawingsController } from "./drawings.controller";
import { DrawingsService } from "./drawings.service";
import { Drawing } from "./entities/drawing.entity";
import { DrawingComment } from "./entities/drawing-comment.entity";
import { DrawingVersion } from "./entities/drawing-version.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Drawing, DrawingVersion, DrawingComment]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [DrawingsController],
  providers: [DrawingsService, DrawingAnalyzerService],
  exports: [DrawingsService, DrawingAnalyzerService],
})
export class DrawingsModule {}
