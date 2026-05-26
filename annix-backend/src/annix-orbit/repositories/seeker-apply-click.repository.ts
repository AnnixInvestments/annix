import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerApplyClick } from "../entities/seeker-apply-click.entity";

export abstract class SeekerApplyClickRepository extends CrudRepository<SeekerApplyClick> {
  abstract findRecentClick(
    candidateId: number,
    externalJobId: number,
    cutoff: Date,
  ): Promise<SeekerApplyClick | null>;
}
