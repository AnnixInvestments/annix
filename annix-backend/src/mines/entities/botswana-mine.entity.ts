import { Entity, Index } from "typeorm";
import { CountryMineBase } from "./country-mine.base";

@Entity("botswana_mines")
@Index(["region"])
@Index(["operationalStatus"])
@Index(["operatingCompany"])
export class BotswanaMine extends CountryMineBase {}
