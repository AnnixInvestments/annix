import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { RfqDraft } from "../rfq/entities/rfq-draft.entity";
import { RfqDraftRepository } from "../rfq/rfq-draft.repository";
import { MongoRfqDraftRepository } from "../rfq/rfq-draft.repository.mongo";
import { PostgresRfqDraftRepository } from "../rfq/rfq-draft.repository.postgres";
import { RfqDraftSchema } from "../rfq/schemas/rfq-draft.schema";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { RemoteAccessRequest } from "./entities/remote-access-request.entity";
import { RemoteAccessFeatureGuard } from "./guards/remote-access-feature.guard";
import { RemoteAccessController } from "./remote-access.controller";
import { RemoteAccessRequestRepository } from "./remote-access.repository";
import { MongoRemoteAccessRequestRepository } from "./remote-access.repository.mongo";
import { PostgresRemoteAccessRequestRepository } from "./remote-access.repository.postgres";
import { RemoteAccessService } from "./remote-access.service";
import { RemoteAccessRequestSchema } from "./schemas/remote-access-request.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "RemoteAccessRequest", schema: RemoteAccessRequestSchema },
            { name: "User", schema: UserSchema },
            { name: "RfqDraft", schema: RfqDraftSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([RemoteAccessRequest, User, RfqDraft])]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AdminModule),
    EmailModule,
    FeatureFlagsModule,
  ],
  providers: [
    RemoteAccessService,
    RemoteAccessFeatureGuard,
    repositoryProvider(
      RemoteAccessRequestRepository,
      PostgresRemoteAccessRequestRepository,
      MongoRemoteAccessRequestRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(RfqDraftRepository, PostgresRfqDraftRepository, MongoRfqDraftRepository),
  ],
  controllers: [RemoteAccessController],
  exports: [RemoteAccessService, RemoteAccessFeatureGuard],
})
export class RemoteAccessModule {}
