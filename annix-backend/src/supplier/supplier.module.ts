import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import {
  SupplierCompany,
  SupplierProfile,
  SupplierOnboarding,
  SupplierDocument,
  SupplierDeviceBinding,
  SupplierLoginAttempt,
  SupplierSession,
  SupplierCapability,
} from './entities';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';

// Services
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierService } from './supplier.service';
import { SupplierAdminService } from './supplier-admin.service';

// Controllers
import { SupplierAuthController } from './supplier-auth.controller';
import { SupplierController } from './supplier.controller';
import { SupplierAdminController } from './supplier-admin.controller';
import { SupplierBoqController } from './supplier-boq.controller';
import { SupplierMessagingController } from './supplier-messaging.controller';

// Guards
import { SupplierAuthGuard } from './guards/supplier-auth.guard';

// External modules
import { UserModule } from '../user/user.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { AdminModule } from '../admin/admin.module';
import { BoqModule } from '../boq/boq.module';
import { NixModule } from '../nix/nix.module';
import { StorageModule } from '../storage/storage.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplierCompany,
      SupplierProfile,
      SupplierOnboarding,
      SupplierDocument,
      SupplierDeviceBinding,
      SupplierLoginAttempt,
      SupplierSession,
      SupplierCapability,
      User,
      UserRole,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuditModule,
    EmailModule,
    AdminModule,
    forwardRef(() => BoqModule),
    forwardRef(() => NixModule),
    StorageModule,
    MessagingModule,
  ],
  controllers: [
    SupplierAuthController,
    SupplierController,
    SupplierAdminController,
    SupplierBoqController,
    SupplierMessagingController,
  ],
  providers: [
    SupplierAuthService,
    SupplierService,
    SupplierAdminService,
    SupplierAuthGuard,
  ],
  exports: [
    SupplierAuthService,
    SupplierService,
    SupplierAuthGuard,
    TypeOrmModule, // Export TypeOrmModule for repository access in other modules
  ],
})
export class SupplierModule {}
