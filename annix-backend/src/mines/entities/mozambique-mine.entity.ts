import { Entity, Index } from "typeorm";
import { CountryMineBase } from "./country-mine.base";

@Entity("mozambique_mines")
@Index(["region"])
@Index(["operationalStatus"])
@Index(["operatingCompany"])
export class MozambiqueMine extends CountryMineBase {}
