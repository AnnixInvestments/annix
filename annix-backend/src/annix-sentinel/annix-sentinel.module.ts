import { Module } from "@nestjs/common";
import { AnnixSentinelAdvisorModule } from "./advisor/advisor.module";
import { AnnixSentinelAiModule } from "./ai/ai.module";
import { AnnixSentinelApiKeysModule } from "./api-keys/api-keys.module";
import { AnnixSentinelBbeeModule } from "./bbee/bbee.module";
import { AnnixSentinelCompaniesModule } from "./companies/companies.module";
import { AnnixSentinelComplianceModule } from "./compliance/compliance.module";
import { AnnixSentinelGovernmentDocumentsModule } from "./government-documents/government-documents.module";
import { AnnixSentinelI18nModule } from "./i18n/i18n.module";
import { AnnixSentinelRegulatoryModule } from "./regulatory/regulatory.module";
import { AnnixSentinelAuthModule } from "./sentinel-auth/auth.module";
import { AnnixSentinelDocumentsModule } from "./sentinel-documents/documents.module";
import { AnnixSentinelIntegrationsModule } from "./sentinel-integrations/integrations.module";
import { AnnixSentinelNotificationsModule } from "./sentinel-notifications/notifications.module";
import { AnnixSentinelTemplatesModule } from "./sentinel-templates/templates.module";
import { AnnixSentinelSubscriptionsModule } from "./subscriptions/subscriptions.module";
import { AnnixSentinelTaxModule } from "./tax/tax.module";
import { AnnixSentinelTenderModule } from "./tender/tender.module";

@Module({
  imports: [
    AnnixSentinelAuthModule,
    AnnixSentinelCompaniesModule,
    AnnixSentinelComplianceModule,
    AnnixSentinelDocumentsModule,
    AnnixSentinelGovernmentDocumentsModule,
    AnnixSentinelNotificationsModule,
    AnnixSentinelBbeeModule,
    AnnixSentinelTaxModule,
    AnnixSentinelTemplatesModule,
    AnnixSentinelAdvisorModule,
    AnnixSentinelAiModule,
    AnnixSentinelTenderModule,
    AnnixSentinelRegulatoryModule,
    AnnixSentinelSubscriptionsModule,
    AnnixSentinelApiKeysModule,
    AnnixSentinelIntegrationsModule,
    AnnixSentinelI18nModule,
  ],
})
export class AnnixSentinelModule {}
