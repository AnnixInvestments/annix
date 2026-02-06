import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { RemoteAccessRequest } from './entities/remote-access-request.entity';
import { RemoteAccessService } from './remote-access.service';
import { RemoteAccessController } from './remote-access.controller';
import { RemoteAccessFeatureGuard } from './guards/remote-access-feature.guard';

import { User } from '../user/entities/user.entity';
import { RfqDraft } from '../rfq/entities/rfq-draft.entity';
import { AdminModule } from '../admin/admin.module';
import { EmailModule } from '../email/email.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RemoteAccessRequest, User, RfqDraft]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AdminModule),
    EmailModule,
    FeatureFlagsModule,
  ],
  providers: [RemoteAccessService, RemoteAccessFeatureGuard],
  controllers: [RemoteAccessController],
  exports: [RemoteAccessService, RemoteAccessFeatureGuard],
})
export class RemoteAccessModule {}
