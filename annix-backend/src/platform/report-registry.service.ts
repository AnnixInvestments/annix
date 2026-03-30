import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  IReportProvider,
  ReportDefinition,
  ReportFilter,
  ReportResult,
} from "./interfaces/report.interface";

@Injectable()
export class ReportRegistryService {
  private readonly logger = new Logger(ReportRegistryService.name);
  private readonly providers = new Map<string, IReportProvider>();

  registerModule(moduleCode: string, provider: IReportProvider): void {
    this.providers.set(moduleCode, provider);
    const definitions = provider.reportDefinitions();
    this.logger.log(`Registered ${definitions.length} reports for module "${moduleCode}"`);
  }

  availableReports(moduleCode?: string): ReportDefinition[] {
    if (moduleCode) {
      const provider = this.providers.get(moduleCode);
      return provider ? provider.reportDefinitions() : [];
    }

    return Array.from(this.providers.values()).flatMap((p) => p.reportDefinitions());
  }

  async generate(reportCode: string, filter: ReportFilter): Promise<ReportResult> {
    const provider = this.providers.get(filter.moduleCode);

    if (!provider) {
      throw new NotFoundException(
        `No report provider registered for module "${filter.moduleCode}"`,
      );
    }

    const definitions = provider.reportDefinitions();
    const exists = definitions.some((d) => d.code === reportCode);

    if (!exists) {
      throw new NotFoundException(
        `Report "${reportCode}" not found in module "${filter.moduleCode}"`,
      );
    }

    return provider.generate(reportCode, filter);
  }

  registeredModules(): string[] {
    return Array.from(this.providers.keys());
  }
}
