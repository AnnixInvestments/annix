import { Injectable, NotFoundException } from "@nestjs/common";
import { fromJSDate } from "../lib/datetime";
import { UserRepository } from "../user/user.repository";
import { ConversationResponseMetricRepository } from "./conversation-response-metric.repository";
import {
  MetricsFilterDto,
  RatingBreakdownDto,
  ResponseMetricsSummaryDto,
  SlaConfigDto,
  UpdateSlaConfigDto,
  UserResponseStatsDto,
} from "./dto";
import { ConversationResponseMetric, Message, ResponseRating, SlaConfig } from "./entities";
import { MessageRepository } from "./message.repository";
import { SlaConfigRepository } from "./sla-config.repository";

@Injectable()
export class ResponseMetricsService {
  constructor(
    private readonly metricRepo: ConversationResponseMetricRepository,
    private readonly messageRepo: MessageRepository,
    private readonly slaConfigRepo: SlaConfigRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async recordResponse(responseMessage: Message): Promise<void> {
    const previousMessage = await this.messageRepo.findPreviousFromOtherSender(
      responseMessage.conversationId,
      responseMessage.senderId,
    );

    if (!previousMessage) {
      return;
    }

    const alreadyExists = await this.metricRepo.existsByMessageAndResponder(
      previousMessage.id,
      responseMessage.senderId,
    );

    if (alreadyExists) {
      return;
    }

    const originalSentAt = fromJSDate(previousMessage.sentAt);
    const responseSentAt = fromJSDate(responseMessage.sentAt);
    const responseTimeMinutes = Math.floor(responseSentAt.diff(originalSentAt, "minutes").minutes);

    const slaConfig = await this.slaConfig();
    const rating = this.ratingForResponseTime(responseTimeMinutes, slaConfig);
    const withinSla = responseTimeMinutes <= slaConfig.responseTimeHours * 60;

    await this.metricRepo.create({
      conversationId: responseMessage.conversationId,
      messageId: previousMessage.id,
      responseMessageId: responseMessage.id,
      responderId: responseMessage.senderId,
      responseTimeMinutes,
      withinSla,
      rating,
    });
  }

  async userResponseStats(
    userId: number,
    filters?: MetricsFilterDto,
  ): Promise<UserResponseStatsDto> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const metrics = await this.metricRepo.findByResponder(userId, filters);

    if (metrics.length === 0) {
      return {
        userId,
        userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        totalResponses: 0,
        averageResponseTimeMinutes: 0,
        slaCompliancePercent: 100,
        ratingBreakdown: {
          excellent: 0,
          good: 0,
          acceptable: 0,
          poor: 0,
          critical: 0,
        },
        overallRating: ResponseRating.EXCELLENT,
      };
    }

    const totalResponseTime = metrics.reduce((sum, m) => sum + m.responseTimeMinutes, 0);
    const slaCompliant = metrics.filter((m) => m.withinSla).length;

    const ratingBreakdown = this.calculateRatingBreakdown(metrics);

    return {
      userId,
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      totalResponses: metrics.length,
      averageResponseTimeMinutes: Math.round(totalResponseTime / metrics.length),
      slaCompliancePercent: Math.round((slaCompliant / metrics.length) * 100),
      ratingBreakdown,
      overallRating: this.dominantRating(ratingBreakdown),
    };
  }

  async responseMetricsSummary(filters?: MetricsFilterDto): Promise<ResponseMetricsSummaryDto> {
    const metrics = await this.metricRepo.findFiltered(filters);

    if (metrics.length === 0) {
      return {
        totalMessagesRequiringResponse: 0,
        totalResponses: 0,
        averageResponseTimeMinutes: 0,
        slaCompliancePercent: 100,
        ratingBreakdown: {
          excellent: 0,
          good: 0,
          acceptable: 0,
          poor: 0,
          critical: 0,
        },
        topPerformers: [],
        usersNeedingAttention: [],
      };
    }

    const totalResponseTime = metrics.reduce((sum, m) => sum + m.responseTimeMinutes, 0);
    const slaCompliant = metrics.filter((m) => m.withinSla).length;
    const ratingBreakdown = this.calculateRatingBreakdown(metrics);

    const userIds = [...new Set(metrics.map((m) => m.responderId))];
    const userStats = await Promise.all(userIds.map((id) => this.userResponseStats(id, filters)));

    const sortedByCompliance = userStats.sort(
      (a, b) => b.slaCompliancePercent - a.slaCompliancePercent,
    );

    const topPerformers = sortedByCompliance
      .filter((u) => u.slaCompliancePercent >= 80)
      .slice(0, 5);

    const usersNeedingAttention = sortedByCompliance
      .filter((u) => u.slaCompliancePercent < 80)
      .slice(-5)
      .reverse();

    return {
      totalMessagesRequiringResponse: metrics.length,
      totalResponses: metrics.length,
      averageResponseTimeMinutes: Math.round(totalResponseTime / metrics.length),
      slaCompliancePercent: Math.round((slaCompliant / metrics.length) * 100),
      ratingBreakdown,
      topPerformers,
      usersNeedingAttention,
    };
  }

  async slaConfig(): Promise<SlaConfig> {
    const config = await this.slaConfigRepo.findFirst();

    if (!config) {
      return this.slaConfigRepo.create({
        responseTimeHours: 24,
        excellentThresholdHours: 4,
        goodThresholdHours: 12,
        acceptableThresholdHours: 24,
        poorThresholdHours: 48,
      });
    }

    return config;
  }

  async slaConfigDto(): Promise<SlaConfigDto> {
    const config = await this.slaConfig();
    return {
      id: config.id,
      responseTimeHours: config.responseTimeHours,
      excellentThresholdHours: config.excellentThresholdHours,
      goodThresholdHours: config.goodThresholdHours,
      acceptableThresholdHours: config.acceptableThresholdHours,
      poorThresholdHours: config.poorThresholdHours,
      updatedAt: config.updatedAt,
    };
  }

  async updateSlaConfig(dto: UpdateSlaConfigDto): Promise<SlaConfigDto> {
    const config = await this.slaConfig();

    if (dto.responseTimeHours !== undefined) {
      config.responseTimeHours = dto.responseTimeHours;
    }
    if (dto.excellentThresholdHours !== undefined) {
      config.excellentThresholdHours = dto.excellentThresholdHours;
    }
    if (dto.goodThresholdHours !== undefined) {
      config.goodThresholdHours = dto.goodThresholdHours;
    }
    if (dto.acceptableThresholdHours !== undefined) {
      config.acceptableThresholdHours = dto.acceptableThresholdHours;
    }
    if (dto.poorThresholdHours !== undefined) {
      config.poorThresholdHours = dto.poorThresholdHours;
    }

    await this.slaConfigRepo.save(config);

    return this.slaConfigDto();
  }

  ratingForResponseTime(responseTimeMinutes: number, config: SlaConfig): ResponseRating {
    const hours = responseTimeMinutes / 60;

    if (hours <= config.excellentThresholdHours) {
      return ResponseRating.EXCELLENT;
    } else if (hours <= config.goodThresholdHours) {
      return ResponseRating.GOOD;
    } else if (hours <= config.acceptableThresholdHours) {
      return ResponseRating.ACCEPTABLE;
    } else if (hours <= config.poorThresholdHours) {
      return ResponseRating.POOR;
    } else {
      return ResponseRating.CRITICAL;
    }
  }

  private calculateRatingBreakdown(metrics: ConversationResponseMetric[]): RatingBreakdownDto {
    return metrics.reduce(
      (acc, m) => {
        const key = m.rating.toLowerCase() as keyof RatingBreakdownDto;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {
        excellent: 0,
        good: 0,
        acceptable: 0,
        poor: 0,
        critical: 0,
      },
    );
  }

  private dominantRating(breakdown: RatingBreakdownDto): ResponseRating {
    const total =
      breakdown.excellent +
      breakdown.good +
      breakdown.acceptable +
      breakdown.poor +
      breakdown.critical;

    if (total === 0) {
      return ResponseRating.EXCELLENT;
    }

    const excellentGoodPercent = ((breakdown.excellent + breakdown.good) / total) * 100;

    if (excellentGoodPercent >= 80) {
      return ResponseRating.EXCELLENT;
    } else if (excellentGoodPercent >= 60) {
      return ResponseRating.GOOD;
    } else if (excellentGoodPercent >= 40) {
      return ResponseRating.ACCEPTABLE;
    } else if (breakdown.critical / total < 0.2) {
      return ResponseRating.POOR;
    } else {
      return ResponseRating.CRITICAL;
    }
  }
}
