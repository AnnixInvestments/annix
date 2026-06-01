import { CrudRepository } from "../../lib/persistence/crud-repository";
import { VoiceProfile } from "./voice-filter.entity";

export abstract class VoiceProfileRepository extends CrudRepository<VoiceProfile> {
  abstract findByUserId(userId: number): Promise<VoiceProfile | null>;
}
