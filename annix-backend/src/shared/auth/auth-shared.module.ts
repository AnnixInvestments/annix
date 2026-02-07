import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthConfigService } from "./auth-config.service";
import { DeviceBindingService } from "./device-binding.service";
import { PasswordService } from "./password.service";
import { RateLimitingService } from "./rate-limiting.service";
import { SessionService } from "./session.service";
import { TokenService } from "./token.service";

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "1h",
        },
      }),
    }),
  ],
  providers: [
    PasswordService,
    TokenService,
    RateLimitingService,
    SessionService,
    DeviceBindingService,
    AuthConfigService,
  ],
  exports: [
    PasswordService,
    TokenService,
    RateLimitingService,
    SessionService,
    DeviceBindingService,
    AuthConfigService,
    JwtModule,
  ],
})
export class AuthSharedModule {}
