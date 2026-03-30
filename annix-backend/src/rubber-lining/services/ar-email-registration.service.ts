import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { ArEmailClassifierService } from "./ar-email-classifier.service";
import { ArEmailRouterService } from "./ar-email-router.service";

const AR_APP_NAME = "au-rubber";

@Injectable()
export class ArEmailRegistrationService implements OnModuleInit {
  private readonly logger = new Logger(ArEmailRegistrationService.name);

  constructor(
    private readonly registry: InboundEmailRegistry,
    private readonly classifier: ArEmailClassifierService,
    private readonly router: ArEmailRouterService,
  ) {}

  onModuleInit() {
    this.registry.registerApp(AR_APP_NAME, this.classifier, this.router);
    this.logger.log("AU Rubber inbound email handler registered");
  }
}
