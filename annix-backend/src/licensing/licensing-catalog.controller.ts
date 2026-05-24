import { Controller, Get, Header, Param } from "@nestjs/common";
import type { ModuleCatalog } from "./dto/module-catalog";
import { LicensingCatalogService } from "./licensing-catalog.service";

@Controller("licensing")
export class LicensingCatalogController {
  constructor(private readonly catalogService: LicensingCatalogService) {}

  @Get(":moduleKey/catalog")
  @Header("Cache-Control", "public, max-age=300")
  catalog(@Param("moduleKey") moduleKey: string): Promise<ModuleCatalog> {
    return this.catalogService.effectiveCatalog(moduleKey);
  }
}
