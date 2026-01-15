import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { NixController } from './nix.controller';
import { NixService } from './nix.service';
import { NixExtraction } from './entities/nix-extraction.entity';
import { NixLearning } from './entities/nix-learning.entity';
import { NixUserPreference } from './entities/nix-user-preference.entity';
import { NixClarification } from './entities/nix-clarification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NixExtraction,
      NixLearning,
      NixUserPreference,
      NixClarification,
    ]),
    MulterModule.register({
      dest: './uploads/nix',
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB for tender documents
      },
    }),
  ],
  controllers: [NixController],
  providers: [NixService],
  exports: [NixService],
})
export class NixModule {}
