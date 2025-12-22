import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { Rfq } from '../rfq/entities/rfq.entity';
import { CustomerProfile } from '../customer/entities/customer-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rfq, CustomerProfile]),
  ],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
