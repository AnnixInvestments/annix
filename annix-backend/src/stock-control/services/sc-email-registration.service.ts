import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { ScEmailClassifierService } from "./sc-email-classifier.service";
import { ScEmailRouterService } from "./sc-email-router.service";

const SC_APP_NAME = "stock-control";

@Injectable()
export class ScEmailRegistrationService implements OnModuleInit {
  private readonly logger = new Logger(ScEmailRegistrationService.name);

  constructor(
    private readonly registry: InboundEmailRegistry,
    private readonly classifier: ScEmailClassifierService,
    private readonly router: ScEmailRouterService,
  ) {}

  onModuleInit() {
    this.registry.registerApp(SC_APP_NAME, this.classifier, this.router);
    this.logger.log("Stock Control inbound email handler registered");
  }
}
