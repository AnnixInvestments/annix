import { CrudRepository } from "../lib/persistence/crud-repository";
import { NixClarification } from "./entities/nix-clarification.entity";

export abstract class NixClarificationRepository extends CrudRepository<NixClarification> {
  abstract findByIdWithExtraction(id: number): Promise<NixClarification | null>;
  abstract countPendingForExtraction(extractionId: number | undefined): Promise<number>;
  abstract findPendingForExtractionOrdered(extractionId: number): Promise<NixClarification[]>;
}
