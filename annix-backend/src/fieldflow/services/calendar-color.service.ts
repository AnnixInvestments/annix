import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CalendarColor,
  type CalendarColorType,
  DEFAULT_MEETING_TYPE_COLORS,
  DEFAULT_STATUS_COLORS,
} from "../entities";

export interface UserColorScheme {
  meetingTypes: Record<string, string>;
  statuses: Record<string, string>;
  calendars: Record<number, string>;
}

@Injectable()
export class CalendarColorService {
  constructor(
    @InjectRepository(CalendarColor)
    private readonly colorRepo: Repository<CalendarColor>,
  ) {}

  async colorsForUser(userId: number): Promise<UserColorScheme> {
    const colors = await this.colorRepo.find({ where: { userId } });

    const meetingTypes = { ...DEFAULT_MEETING_TYPE_COLORS };
    const statuses = { ...DEFAULT_STATUS_COLORS };
    const calendars: Record<number, string> = {};

    colors.forEach((color) => {
      if (color.colorType === "meeting_type") {
        meetingTypes[color.colorKey] = color.colorValue;
      } else if (color.colorType === "status") {
        statuses[color.colorKey] = color.colorValue;
      } else if (color.colorType === "calendar") {
        calendars[parseInt(color.colorKey, 10)] = color.colorValue;
      }
    });

    return { meetingTypes, statuses, calendars };
  }

  async setColor(
    userId: number,
    colorType: CalendarColorType,
    colorKey: string,
    colorValue: string,
  ): Promise<CalendarColor> {
    const existing = await this.colorRepo.findOne({
      where: { userId, colorType, colorKey },
    });

    if (existing) {
      existing.colorValue = colorValue;
      return this.colorRepo.save(existing);
    }

    const newColor = this.colorRepo.create({
      userId,
      colorType,
      colorKey,
      colorValue,
    });

    return this.colorRepo.save(newColor);
  }

  async setColors(
    userId: number,
    colors: Array<{ colorType: CalendarColorType; colorKey: string; colorValue: string }>,
  ): Promise<void> {
    const promises = colors.map((c) =>
      this.setColor(userId, c.colorType, c.colorKey, c.colorValue),
    );
    await Promise.all(promises);
  }

  async resetToDefaults(userId: number, colorType?: CalendarColorType): Promise<void> {
    const whereClause = colorType ? { userId, colorType } : { userId };
    await this.colorRepo.delete(whereClause);
  }
}
