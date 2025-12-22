import { Module } from '@nestjs/common';
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

// Guards
import { SupplierAuthGuard } from './guards/supplier-auth.guard';

// External modules
import { UserModule } from '../user/user.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';

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
      User,
      UserRole,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuditModule,
    EmailModule,
  ],
  controllers: [
    SupplierAuthController,
    SupplierController,
    SupplierAdminController,
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
  ],
})
export class SupplierModule {}
