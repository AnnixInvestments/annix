import { Controller, Get, Header, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CURRENCIES, type Currency, DEFAULT_CURRENCY } from "../lib/reference-data/currencies";
import { PublicStatsDto } from "./dto/public-stats.dto";
import { PublicService } from "./public.service";

const STATS_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

@ApiTags("Public")
@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("stats")
  @Header("Cache-Control", STATS_CACHE_CONTROL)
  @ApiOperation({
    summary: "Get public dashboard statistics",
    description:
      "Returns public statistics for the home page dashboard including RFQ count, supplier count, and upcoming RFQ closing dates. No authentication required.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Statistics retrieved successfully",
    type: PublicStatsDto,
  })
  async getPublicStats(): Promise<PublicStatsDto> {
    return this.publicService.getPublicStats();
  }

  @Get("stats/rfq-count")
  @Header("Cache-Control", STATS_CACHE_CONTROL)
  @ApiOperation({
    summary: "Get total RFQ count",
    description: "Returns the total number of RFQs in the system",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "RFQ count retrieved successfully",
    schema: {
      type: "object",
      properties: {
        count: { type: "number", example: 150 },
      },
    },
  })
  async getRfqCount(): Promise<{ count: number }> {
    const count = await this.publicService.getRfqCount();
    return { count };
  }

  @Get("stats/customer-count")
  @Header("Cache-Control", STATS_CACHE_CONTROL)
  @ApiOperation({
    summary: "Get total customer count",
    description: "Returns the total number of registered customers",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Customer count retrieved successfully",
    schema: {
      type: "object",
      properties: {
        count: { type: "number", example: 50 },
      },
    },
  })
  async getCustomerCount(): Promise<{ count: number }> {
    const count = await this.publicService.getCustomerCount();
    return { count };
  }

  @Get("stats/supplier-count")
  @Header("Cache-Control", STATS_CACHE_CONTROL)
  @ApiOperation({
    summary: "Get total supplier count",
    description: "Returns the total number of registered suppliers",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Supplier count retrieved successfully",
    schema: {
      type: "object",
      properties: {
        count: { type: "number", example: 25 },
      },
    },
  })
  async getSupplierCount(): Promise<{ count: number }> {
    const count = await this.publicService.getSupplierCount();
    return { count };
  }

  @Get("reference/currencies")
  @Header("Cache-Control", IMMUTABLE_CACHE_CONTROL)
  @ApiOperation({
    summary: "List global currencies",
    description:
      "Returns the global currency reference list (ISO 4217 codes, names, symbols, countries). Used as a shared source of truth across apps so new clients do not re-duplicate the list.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Currency list retrieved successfully",
  })
  referenceCurrencies(): { currencies: Currency[]; defaultCurrency: string } {
    return { currencies: CURRENCIES, defaultCurrency: DEFAULT_CURRENCY };
  }
}
