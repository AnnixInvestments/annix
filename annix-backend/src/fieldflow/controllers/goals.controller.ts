import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import { GoalPeriod } from "../entities";
import { type CreateGoalDto, GoalsService, type UpdateGoalDto } from "../services/goals.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Goals")
@Controller("annix-rep/goals")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: "Get all sales goals" })
  @ApiResponse({ status: 200, description: "List of sales goals" })
  goals(@Req() req: AnnixRepRequest) {
    return this.goalsService.goals(req.annixRepUser.userId);
  }

  @Get(":period")
  @ApiOperation({ summary: "Get sales goal for a specific period" })
  @ApiParam({ name: "period", enum: GoalPeriod })
  @ApiResponse({ status: 200, description: "Sales goal for the period" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  async goalByPeriod(@Req() req: AnnixRepRequest, @Param("period") period: GoalPeriod) {
    const goal = await this.goalsService.goalByPeriod(req.annixRepUser.userId, period);
    if (!goal) {
      throw new NotFoundException(`No goal found for period: ${period}`);
    }
    return goal;
  }

  @Post()
  @ApiOperation({ summary: "Create or update a sales goal" })
  @ApiResponse({ status: 201, description: "Goal created or updated" })
  createOrUpdateGoal(@Req() req: AnnixRepRequest, @Body() dto: CreateGoalDto) {
    return this.goalsService.createOrUpdateGoal(req.annixRepUser.userId, dto);
  }

  @Put(":period")
  @ApiOperation({ summary: "Update a sales goal" })
  @ApiParam({ name: "period", enum: GoalPeriod })
  @ApiResponse({ status: 200, description: "Goal updated" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  async updateGoal(
    @Req() req: AnnixRepRequest,
    @Param("period") period: GoalPeriod,
    @Body() dto: UpdateGoalDto,
  ) {
    const goal = await this.goalsService.updateGoal(req.annixRepUser.userId, period, dto);
    if (!goal) {
      throw new NotFoundException(`No goal found for period: ${period}`);
    }
    return goal;
  }

  @Delete(":period")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a sales goal" })
  @ApiParam({ name: "period", enum: GoalPeriod })
  @ApiResponse({ status: 204, description: "Goal deleted" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  async deleteGoal(@Req() req: AnnixRepRequest, @Param("period") period: GoalPeriod) {
    const deleted = await this.goalsService.deleteGoal(req.annixRepUser.userId, period);
    if (!deleted) {
      throw new NotFoundException(`No goal found for period: ${period}`);
    }
  }

  @Get(":period/progress")
  @ApiOperation({ summary: "Get progress towards goals for a period" })
  @ApiParam({ name: "period", enum: GoalPeriod })
  @ApiResponse({ status: 200, description: "Goal progress data" })
  progress(@Req() req: AnnixRepRequest, @Param("period") period: GoalPeriod) {
    return this.goalsService.progress(req.annixRepUser.userId, period);
  }
}
