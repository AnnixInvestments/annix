import { Injectable, Logger } from "@nestjs/common";
import {
  CreateUnifiedRfqDto,
  UnifiedBendDto,
  UnifiedFittingDto,
  UnifiedRfqItemDto,
  UnifiedStraightPipeDto,
} from "../../rfq/dto/create-unified-rfq.dto";
import { RfqStatus } from "../../rfq/entities/rfq.entity";
import { RfqService } from "../../rfq/rfq.service";
import {
  CreateItemsFromChatDto,
  CreateItemsResponseDto,
  ParsedItemDto,
  ParseItemsRequestDto,
  ParseItemsResponseDto,
} from "../dto/chat-item.dto";
import { NixChatSession } from "../entities/nix-chat-session.entity";
import { MultiItemParseResult, NixItemParserService } from "./nix-item-parser.service";

@Injectable()
export class NixChatItemService {
  private readonly logger = new Logger(NixChatItemService.name);

  constructor(
    private readonly itemParserService: NixItemParserService,
    private readonly rfqService: RfqService,
  ) {}

  async parseItemsFromMessage(
    session: NixChatSession,
    dto: ParseItemsRequestDto,
  ): Promise<ParseItemsResponseDto> {
    const context = {
      currentItems: session.sessionContext?.currentRfqItems || [],
      recentMessages: session.conversationHistory?.slice(-5).map((h) => h.content) || [],
    };

    const parseResult: MultiItemParseResult = await this.itemParserService.parseMultipleItems(
      dto.message,
      context,
    );

    const parsedItems: ParsedItemDto[] = parseResult.items.map((item) => ({
      action: item.action,
      itemType: item.itemType,
      specifications: item.specifications,
      confidence: item.confidence,
      explanation: item.explanation,
      originalText: item.originalText,
    }));

    const validationIssues = this.validateParsedItems(parsedItems);
    const hasLowConfidence = parsedItems.some((item) => item.confidence < 0.7);
    const hasMissingFields = parsedItems.some(
      (item) =>
        item.action === "create_item" &&
        (!item.specifications?.diameter || !item.itemType),
    );

    return {
      sessionId: session.id,
      parsedItems,
      requiresConfirmation: hasLowConfidence || hasMissingFields || (validationIssues?.length ?? 0) > 0,
      validationIssues,
    };
  }

  async createItemsFromChat(
    session: NixChatSession,
    dto: CreateItemsFromChatDto,
    userId: number,
  ): Promise<CreateItemsResponseDto> {
    const itemsToCreate = this.filterConfirmedItems(dto);
    if (itemsToCreate.length === 0) {
      return {
        success: false,
        rfqId: 0,
        rfqNumber: "",
        itemsCreated: 0,
        items: [],
        failedItems: [{ index: 0, reason: "No items confirmed for creation" }],
      };
    }

    const unifiedItems = itemsToCreate
      .map((item, index) => this.convertToUnifiedItem(item, index))
      .filter((item): item is UnifiedRfqItemDto => item !== null);

    if (unifiedItems.length === 0) {
      return {
        success: false,
        rfqId: 0,
        rfqNumber: "",
        itemsCreated: 0,
        items: [],
        failedItems: itemsToCreate.map((_, index) => ({
          index,
          reason: "Could not convert to RFQ item format",
        })),
      };
    }

    const rfqDto: CreateUnifiedRfqDto = {
      rfq: {
        projectName: dto.rfqTitle || `RFQ from Chat Session ${session.id}`,
        description: `Created via Nix chat assistant`,
        status: RfqStatus.DRAFT,
      },
      items: unifiedItems,
    };

    try {
      const result = await this.rfqService.createUnifiedRfq(rfqDto, userId);

      this.logger.log(
        `Created RFQ ${result.rfq.rfqNumber} with ${result.itemsCreated} items from chat session ${session.id}`,
      );

      return {
        success: true,
        rfqId: result.rfq.id,
        rfqNumber: result.rfq.rfqNumber,
        itemsCreated: result.itemsCreated,
        items: unifiedItems.map((item, index) => ({
          lineNumber: index + 1,
          itemType: item.itemType,
          description: item.description,
          quantity: this.extractQuantity(item),
          originalIndex: index,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to create RFQ from chat: ${error.message}`);
      return {
        success: false,
        rfqId: 0,
        rfqNumber: "",
        itemsCreated: 0,
        items: [],
        failedItems: [{ index: 0, reason: error.message }],
      };
    }
  }

  private filterConfirmedItems(dto: CreateItemsFromChatDto): ParsedItemDto[] {
    if (!dto.confirmations || dto.confirmations.length === 0) {
      return dto.items.filter((item) => item.action === "create_item");
    }

    return dto.items.filter((item, index) => {
      const confirmation = dto.confirmations?.find((c) => c.index === index);
      if (!confirmation) {
        return item.action === "create_item" && item.confidence >= 0.7;
      }
      if (confirmation.confirmed && confirmation.modifiedSpecs) {
        item.specifications = { ...item.specifications, ...confirmation.modifiedSpecs };
      }
      return confirmation.confirmed && item.action === "create_item";
    });
  }

  private convertToUnifiedItem(item: ParsedItemDto, index: number): UnifiedRfqItemDto | null {
    const specs = item.specifications || {};
    const baseDescription =
      specs.description ||
      `${specs.diameter || "?"}NB ${item.itemType || "item"} (from chat)`;

    switch (item.itemType) {
      case "pipe":
        return this.createStraightPipeItem(specs, baseDescription);

      case "bend":
        return this.createBendItem(specs, baseDescription);

      case "reducer":
      case "tee":
        return this.createFittingItem(item.itemType, specs, baseDescription);

      default:
        this.logger.warn(`Unsupported item type for chat creation: ${item.itemType}`);
        return null;
    }
  }

  private createStraightPipeItem(
    specs: ParsedItemDto["specifications"],
    description: string,
  ): UnifiedRfqItemDto {
    const straightPipe: UnifiedStraightPipeDto = {
      nominalBoreMm: specs?.diameter || 200,
      scheduleType: "schedule",
      scheduleNumber: specs?.schedule || "Sch 40",
      pipeEndConfiguration: this.mapFlangeConfig(specs?.flangeConfig),
      individualPipeLength: specs?.length || 6,
      lengthUnit: "meters",
      quantityType: "number_of_pipes",
      quantityValue: specs?.quantity || 1,
    };

    return {
      itemType: "straight_pipe",
      description,
      straightPipe,
    };
  }

  private createBendItem(
    specs: ParsedItemDto["specifications"],
    description: string,
  ): UnifiedRfqItemDto {
    const bend: UnifiedBendDto = {
      nominalBoreMm: specs?.diameter || 200,
      scheduleNumber: specs?.schedule || "Sch 40",
      bendDegrees: specs?.angle || 90,
      bendEndConfiguration: this.mapBendEndConfig(specs?.flangeConfig),
      numberOfTangents: 0,
      tangentLengths: [],
      quantityType: "number_of_items",
      quantityValue: specs?.quantity || 1,
      bendRadiusType: "long",
    };

    return {
      itemType: "bend",
      description,
      bend,
    };
  }

  private createFittingItem(
    itemType: "reducer" | "tee",
    specs: ParsedItemDto["specifications"],
    description: string,
  ): UnifiedRfqItemDto {
    const fittingTypeMap: Record<string, string> = {
      reducer: "CONCENTRIC_REDUCER",
      tee: "SHORT_TEE",
    };

    const fitting: UnifiedFittingDto = {
      nominalDiameterMm: specs?.diameter || 200,
      scheduleNumber: specs?.schedule || "Sch 40",
      fittingType: fittingTypeMap[itemType] || "SHORT_TEE",
      fittingStandard: "SABS719",
      pipeEndConfiguration: this.mapFlangeConfig(specs?.flangeConfig),
      quantityType: "number_of_items",
      quantityValue: specs?.quantity || 1,
    };

    return {
      itemType: "fitting",
      description,
      fitting,
    };
  }

  private mapFlangeConfig(config?: string): string {
    const configMap: Record<string, string> = {
      none: "PE",
      one_end: "FOE_LF",
      both_ends: "FBE",
      puddle: "FOE_PF",
      blind: "FOE_BF",
    };
    return configMap[config || "none"] || "PE";
  }

  private mapBendEndConfig(config?: string): string {
    const configMap: Record<string, string> = {
      none: "PE",
      one_end: "1xLF",
      both_ends: "2xLF",
    };
    return configMap[config || "none"] || "PE";
  }

  private extractQuantity(item: UnifiedRfqItemDto): number {
    if (item.straightPipe) return item.straightPipe.quantityValue;
    if (item.bend) return item.bend.quantityValue;
    if (item.fitting) return item.fitting.quantityValue || 1;
    return 1;
  }

  private validateParsedItems(
    items: ParsedItemDto[],
  ): ParseItemsResponseDto["validationIssues"] {
    const issues: NonNullable<ParseItemsResponseDto["validationIssues"]> = [];

    items.forEach((item, index) => {
      if (item.action !== "create_item") return;

      if (!item.specifications?.diameter) {
        issues.push({
          itemIndex: index,
          severity: "error",
          field: "diameter",
          message: "Diameter is required",
          suggestion: "Specify the nominal bore (e.g., 200NB)",
        });
      }

      if (!item.itemType) {
        issues.push({
          itemIndex: index,
          severity: "error",
          field: "itemType",
          message: "Item type is required",
          suggestion: "Specify the item type (pipe, bend, reducer, etc.)",
        });
      }

      if (item.itemType === "bend" && !item.specifications?.angle) {
        issues.push({
          itemIndex: index,
          severity: "warning",
          field: "angle",
          message: "Bend angle not specified",
          suggestion: "Specify the bend angle (e.g., 45 or 90 degrees). Defaulting to 90.",
        });
      }

      if (item.itemType === "reducer" && !item.specifications?.secondaryDiameter) {
        issues.push({
          itemIndex: index,
          severity: "warning",
          field: "secondaryDiameter",
          message: "Reducer secondary diameter not specified",
          suggestion: "Specify the outlet diameter (e.g., 150NB)",
        });
      }
    });

    return issues;
  }
}
