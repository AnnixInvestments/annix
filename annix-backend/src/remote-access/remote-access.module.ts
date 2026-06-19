import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { RfqDraftRepository } from "../rfq/rfq-draft.repository";
import { MongoRfqDraftRepository } from "../rfq/rfq-draft.repository.mongo";
import { RfqDraftSchema } from "../rfq/schemas/rfq-draft.schema";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { RemoteAccessFeatureGuard } from "./guards/remote-access-feature.guard";
import { RemoteAccessController } from "./remote-access.controller";
import { RemoteAccessRequestRepository } from "./remote-access.repository";
import { MongoRemoteAccessRequestRepository } from "./remote-access.repository.mongo";
import { RemoteAccessService } from "./remote-access.service";
import { RemoteAccessRequestSchema } from "./schemas/remote-access-request.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "RemoteAccessRequest", schema: RemoteAccessRequestSchema },
      { name: "User", schema: UserSchema },
      { name: "RfqDraft", schema: RfqDraftSchema },
    ]),
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
    repositoryProvider(RemoteAccessRequestRepository, MongoRemoteAccessRequestRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(RfqDraftRepository, MongoRfqDraftRepository),
  ],
  controllers: [RemoteAccessController],
  exports: [RemoteAccessService, RemoteAccessFeatureGuard],
})
export class RemoteAccessModule {}
