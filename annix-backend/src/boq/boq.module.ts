import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Boq } from './entities/boq.entity';
import { BoqLineItem } from './entities/boq-line-item.entity';
import { BoqController } from './boq.controller';
import { BoqService } from './boq.service';
import { BoqParserService } from './boq-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Boq, BoqLineItem]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
  ],
  controllers: [BoqController],
  providers: [BoqService, BoqParserService],
  exports: [BoqService],
})
export class BoqModule {}
