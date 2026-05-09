import { Entity, Index } from "typeorm";
import { CountryMineBase } from "./country-mine.base";

@Entity("zambia_mines")
@Index(["region"])
@Index(["operationalStatus"])
@Index(["operatingCompany"])
export class ZambiaMine extends CountryMineBase {}
