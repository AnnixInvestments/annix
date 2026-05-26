import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SourceRespectRank } from "../entities/source-respect-rank.entity";

export abstract class SourceRespectRankRepository extends CrudRepository<SourceRespectRank> {}
