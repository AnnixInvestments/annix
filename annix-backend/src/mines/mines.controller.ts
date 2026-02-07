import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import {
  CommodityDto,
  CreateSaMineDto,
  LiningCoatingRuleDto,
  MineWithEnvironmentalDataDto,
  SaMineDto,
  SlurryProfileDto,
} from "./dto/mine.dto";
import { OperationalStatus } from "./entities/sa-mine.entity";
import { MinesService } from "./mines.service";

@Controller("mines")
export class MinesController {
  constructor(private readonly minesService: MinesService) {}

  @Get("commodities")
  async getAllCommodities(): Promise<CommodityDto[]> {
    return this.minesService.getAllCommodities();
  }

  @Get("provinces")
  async getProvinces(): Promise<string[]> {
    return this.minesService.getProvinces();
  }

  @Get()
  async getAllMines(
    @Query("commodityId") commodityId?: number,
    @Query("province") province?: string,
    @Query("status") status?: OperationalStatus,
  ): Promise<SaMineDto[]> {
    return this.minesService.getAllMines(commodityId, province, status);
  }

  @Get("active")
  async getActiveMines(): Promise<SaMineDto[]> {
    return this.minesService.getActiveMines();
  }

  @Post()
  async createMine(@Body() createMineDto: CreateSaMineDto): Promise<SaMineDto> {
    return this.minesService.createMine(createMineDto);
  }

  @Get("slurry-profiles")
  async getAllSlurryProfiles(): Promise<SlurryProfileDto[]> {
    return this.minesService.getAllSlurryProfiles();
  }

  @Get("lining-rules")
  async getAllLiningRules(): Promise<LiningCoatingRuleDto[]> {
    return this.minesService.getAllLiningRules();
  }

  @Get(":id")
  async getMineById(@Param("id", ParseIntPipe) id: number): Promise<SaMineDto> {
    return this.minesService.getMineById(id);
  }

  @Get(":id/environmental-data")
  async getMineWithEnvironmentalData(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<MineWithEnvironmentalDataDto> {
    return this.minesService.getMineWithEnvironmentalData(id);
  }
}
