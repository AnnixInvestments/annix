import type { TradeKey } from "@annix/product-data/sa-market";
import { TRADE_KEYS } from "@annix/product-data/sa-market";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Repository } from "typeorm";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { WorkforceNeedService } from "../services/workforce-need.service";

class UpsertWorkforceNeedDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(TRADE_KEYS as unknown as string[], { each: true })
  requiredTrades: TradeKey[];

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedHeadcount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  radiusKm?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  projectLocation?: string | null;
}

@Controller("admin/cv-assistant/workforce-needs")
@UseGuards(AdminAuthGuard)
export class WorkforceNeedController {
  constructor(
    private readonly workforceNeedService: WorkforceNeedService,
    @InjectRepository(Rfq)
    private readonly rfqRepo: Repository<Rfq>,
  ) {}

  @Get(":rfqId")
  async summary(@Param("rfqId", ParseIntPipe) rfqId: number) {
    const summary = await this.workforceNeedService.calculateForRfq(rfqId);
    if (!summary) {
      throw new NotFoundException("RFQ not found");
    }
    return summary;
  }

  @Put(":rfqId")
  async upsert(@Param("rfqId", ParseIntPipe) rfqId: number, @Body() body: UpsertWorkforceNeedDto) {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId } });
    if (!rfq) {
      throw new NotFoundException("RFQ not found");
    }
    const projectLocationChanged =
      body.projectLocation !== undefined && body.projectLocation !== rfq.projectLocation;

    await this.rfqRepo.update(rfqId, {
      requiredTrades: body.requiredTrades,
      estimatedHeadcount: body.estimatedHeadcount ?? null,
      radiusKm: body.radiusKm ?? null,
      projectLocation: body.projectLocation ?? null,
      ...(projectLocationChanged ? { projectLocationLat: null, projectLocationLon: null } : {}),
    });

    return this.workforceNeedService.calculateForRfq(rfqId);
  }
}
