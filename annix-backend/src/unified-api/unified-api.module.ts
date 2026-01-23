import { Module } from '@nestjs/common';
import { UnifiedApiController } from './unified-api.controller';
import { UnifiedApiService } from './unified-api.service';

@Module({
  controllers: [UnifiedApiController],
  providers: [UnifiedApiService],
  exports: [UnifiedApiService],
})
export class UnifiedApiModule {}
