import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AnyUserAuthGuard } from "../../auth/guards/any-user-auth.guard";
import { NixCapabilityRegistry } from "../capabilities";
import { NixAppDto, NixCapabilityDto } from "../dto/nix-capability.dto";

@ApiTags("nix")
@ApiBearerAuth()
@UseGuards(AnyUserAuthGuard)
@Controller("nix/capabilities")
export class NixCapabilitiesController {
  constructor(private readonly registry: NixCapabilityRegistry) {}

  @Get()
  @ApiOperation({
    summary: "List Nix capabilities, optionally filtered by app",
    description:
      "Returns the registered Nix capabilities so the frontend NixAppProvider can pick which intents/guides to surface in chat. Pass `?appCode=` to scope to one app's capabilities.",
  })
  @ApiQuery({ name: "appCode", required: false })
  @ApiResponse({ status: 200, type: [NixCapabilityDto] })
  list(@Query("appCode") appCode?: string): NixCapabilityDto[] {
    const capabilities = appCode ? this.registry.forApp(appCode) : this.registry.all();
    return capabilities.map((c) => NixCapabilityDto.from(c));
  }

  @Get("apps")
  @ApiOperation({
    summary: "List apps that have at least one registered Nix capability",
    description:
      "Returns one entry per app that has registered into NixCapabilityRegistry. Used by cross-app routing previews and the chat-panel app selector.",
  })
  @ApiResponse({ status: 200, type: [NixAppDto] })
  apps(): NixAppDto[] {
    const allCaps = this.registry.all();
    const counts = new Map<string, number>();
    for (const cap of allCaps) {
      counts.set(cap.appCode, (counts.get(cap.appCode) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([appCode, capabilityCount]) => {
        const dto = new NixAppDto();
        dto.appCode = appCode;
        dto.capabilityCount = capabilityCount;
        return dto;
      });
  }
}
