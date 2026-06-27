import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { RubberBoardMeeting } from "../entities/rubber-board-meeting.entity";

export abstract class RubberBoardMeetingRepository extends CrudRepository<RubberBoardMeeting> {
  abstract findAllOrderedByDate(): Promise<RubberBoardMeeting[]>;
  abstract findByProviderExternalId(
    provider: string,
    externalId: string,
  ): Promise<RubberBoardMeeting | null>;
  abstract findRecentWithMinutes(limit: number): Promise<RubberBoardMeeting[]>;
  abstract build(data: Partial<RubberBoardMeeting>): RubberBoardMeeting;
  abstract deleteById(id: number): Promise<boolean>;
}
