import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { RemoteAccessRequest } from './entities/remote-access-request.entity';
import { RemoteAccessService } from './remote-access.service';
import { RemoteAccessController } from './remote-access.controller';
import { RemoteAccessFeatureGuard } from './guards/remote-access-feature.guard';

import { User } from '../user/entities/user.entity';
import { RfqDraft } from '../rfq/entities/rfq-draft.entity';
import { AdminModule } from '../admin/admin.module';
import { CustomerModule } from '../customer/customer.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RemoteAccessRequest, User, RfqDraft]),
    ConfigModule,
    forwardRef(() => AdminModule),
    forwardRef(() => CustomerModule),
    EmailModule,
  ],
  providers: [RemoteAccessService, RemoteAccessFeatureGuard],
  controllers: [RemoteAccessController],
  exports: [RemoteAccessService, RemoteAccessFeatureGuard],
})
export class RemoteAccessModule {}
