import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import {
  CustomerCompany,
  CustomerProfile,
  CustomerDeviceBinding,
  CustomerLoginAttempt,
  CustomerSession,
  CustomerOnboarding,
  CustomerDocument,
  CustomerPreferredSupplier,
  SupplierInvitation,
} from './entities';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';

// Services
import { CustomerAuthService } from './customer-auth.service';
import { CustomerService } from './customer.service';
import { CustomerAdminService } from './customer-admin.service';
import { CustomerOnboardingService } from './customer-onboarding.service';
import { CustomerDocumentService } from './customer-document.service';
import { CustomerSupplierService } from './customer-supplier.service';

// Controllers
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerController } from './customer.controller';
import { CustomerAdminController } from './customer-admin.controller';
import { CustomerOnboardingController } from './customer-onboarding.controller';
import { CustomerDocumentController } from './customer-document.controller';
import { CustomerSupplierController } from './customer-supplier.controller';

// External modules
import { UserModule } from '../user/user.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCompany,
      CustomerProfile,
      CustomerDeviceBinding,
      CustomerLoginAttempt,
      CustomerSession,
      CustomerOnboarding,
      CustomerDocument,
      CustomerPreferredSupplier,
      SupplierInvitation,
      SupplierProfile,
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
    CustomerAuthController,
    CustomerController,
    CustomerAdminController,
    CustomerOnboardingController,
    CustomerDocumentController,
    CustomerSupplierController,
  ],
  providers: [
    CustomerAuthService,
    CustomerService,
    CustomerAdminService,
    CustomerOnboardingService,
    CustomerDocumentService,
    CustomerSupplierService,
  ],
  exports: [
    CustomerAuthService,
    CustomerService,
    CustomerOnboardingService,
  ],
})
export class CustomerModule {}
