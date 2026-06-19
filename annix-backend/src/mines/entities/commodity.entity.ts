import { SaMine } from "./sa-mine.entity";
import { SlurryProfile } from "./slurry-profile.entity";

export class Commodity {
  id: number;

  commodityName: string;

  typicalProcessRoute: string | null;

  applicationNotes: string | null;

  mines: SaMine[];

  slurryProfiles: SlurryProfile[];
}
