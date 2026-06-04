import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  AnnixOrbitIndividualDocument,
  IndividualDocumentKind,
} from "../entities/annix-orbit-individual-document.entity";

export abstract class AnnixOrbitIndividualDocumentRepository extends CrudRepository<AnnixOrbitIndividualDocument> {
  abstract findByProfile(profileId: number): Promise<AnnixOrbitIndividualDocument[]>;
  abstract findByProfileOrdered(profileId: number): Promise<AnnixOrbitIndividualDocument[]>;
  abstract findByProfileAndKind(
    profileId: number,
    kind: IndividualDocumentKind,
  ): Promise<AnnixOrbitIndividualDocument | null>;
  abstract findByIdForProfile(
    documentId: number,
    profileId: number,
  ): Promise<AnnixOrbitIndividualDocument | null>;
  abstract deleteById(documentId: number): Promise<void>;
  abstract deleteByProfile(profileId: number): Promise<void>;
  abstract findPendingClearScan(
    dueBefore: Date,
    maxReminders: number,
  ): Promise<AnnixOrbitIndividualDocument[]>;
  abstract clearScanFlagForProfileKind(
    profileId: number,
    kind: IndividualDocumentKind,
  ): Promise<void>;
}
