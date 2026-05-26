import { CrudRepository } from "../lib/persistence/crud-repository";
import { NixUserPreference } from "./entities/nix-user-preference.entity";

export abstract class NixUserPreferenceRepository extends CrudRepository<NixUserPreference> {}
