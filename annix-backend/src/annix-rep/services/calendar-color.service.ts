import { Injectable } from "@nestjs/common";
import { CalendarColorRepository } from "../calendar-color.repository";
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
  constructor(private readonly colorRepo: CalendarColorRepository) {}

  async colorsForUser(userId: number): Promise<UserColorScheme> {
    const colors = await this.colorRepo.findByUser(userId);

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
    const existing = await this.colorRepo.findByUserTypeKey(userId, colorType, colorKey);

    if (existing) {
      existing.colorValue = colorValue;
      return this.colorRepo.save(existing);
    }

    return this.colorRepo.create({
      userId,
      colorType,
      colorKey,
      colorValue,
    });
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
    if (colorType) {
      await this.colorRepo.deleteByUserAndType(userId, colorType);
    } else {
      await this.colorRepo.deleteByUser(userId);
    }
  }
}
