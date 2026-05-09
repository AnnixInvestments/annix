import { Entity, Index } from "typeorm";
import { CountryMineBase } from "./country-mine.base";

@Entity("namibia_mines")
@Index(["region"])
@Index(["operationalStatus"])
@Index(["operatingCompany"])
export class NamibiaMine extends CountryMineBase {}
