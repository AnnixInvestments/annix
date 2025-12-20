import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Drawing } from './entities/drawing.entity';
import { DrawingVersion } from './entities/drawing-version.entity';
import { DrawingComment } from './entities/drawing-comment.entity';
import { DrawingsController } from './drawings.controller';
import { DrawingsService } from './drawings.service';
import { DrawingAnalyzerService } from './drawing-analyzer.service';

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
