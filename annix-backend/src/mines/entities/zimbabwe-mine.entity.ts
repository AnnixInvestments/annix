import { Entity, Index } from "typeorm";
import { CountryMineBase } from "./country-mine.base";

@Entity("zimbabwe_mines")
@Index(["region"])
@Index(["operationalStatus"])
@Index(["operatingCompany"])
export class ZimbabweMine extends CountryMineBase {}
