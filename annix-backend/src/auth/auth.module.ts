import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoAppRepository, MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import { AppSchema } from "../rbac/schemas/app.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { UnifiedLoginController } from "./unified-login.controller";
import { UnifiedLoginService } from "./unified-login.service";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "App", schema: AppSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
    ]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "8h",
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    UnifiedLoginService,
    JwtStrategy,
    JwtAuthGuard,
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
  ],
  controllers: [AuthController, UnifiedLoginController],
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard],
})
export class AuthModule {}
