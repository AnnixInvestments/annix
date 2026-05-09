import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { BotswanaMine } from "./entities/botswana-mine.entity";
import type { CountryMineBase } from "./entities/country-mine.base";
import { MozambiqueMine } from "./entities/mozambique-mine.entity";
import { NamibiaMine } from "./entities/namibia-mine.entity";
import { SaMine } from "./entities/sa-mine.entity";
import { ZambiaMine } from "./entities/zambia-mine.entity";
import { ZimbabweMine } from "./entities/zimbabwe-mine.entity";

export type Country =
  | "South Africa"
  | "Botswana"
  | "Namibia"
  | "Zimbabwe"
  | "Zambia"
  | "Mozambique";

/**
 * Cross-app mine reference. A mine record from any of the six country tables,
 * tagged with the country it belongs to. Inference + RFQ tooling work off
 * this shape and don't care which table the row originated in.
 */
export interface MineRecord {
  country: Country;
  id: number;
  mineName: string;
  operatingCompany: string;
  region?: string;
  district?: string | null;
  nearestTown?: string | null;
  physicalAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Single entry-point for "give me every known mine across the platform".
 * Stitches the per-country tables (sa_mines, botswana_mines, namibia_mines,
 * zimbabwe_mines, zambia_mines, mozambique_mines) into one flat list,
 * tagging each record with its country so callers can filter or group.
 *
 * Used by:
 * - MineInferenceService — fuzzy-matches Gemini-extracted client / project
 *   metadata against every known mine to auto-tag Nix extractions.
 * - RFQ pricing tools — reads logistics + climate fields off the matched
 *   record to adjust freight, packaging, coatings.
 * - The "create new mine" flow — knows which table to insert into based
 *   on the user's country selection.
 */
@Injectable()
export class MineRegistryService {
  constructor(
    @InjectRepository(SaMine) private readonly saRepo: Repository<SaMine>,
    @InjectRepository(BotswanaMine) private readonly bwRepo: Repository<BotswanaMine>,
    @InjectRepository(NamibiaMine) private readonly naRepo: Repository<NamibiaMine>,
    @InjectRepository(ZimbabweMine) private readonly zwRepo: Repository<ZimbabweMine>,
    @InjectRepository(ZambiaMine) private readonly zmRepo: Repository<ZambiaMine>,
    @InjectRepository(MozambiqueMine) private readonly mzRepo: Repository<MozambiqueMine>,
  ) {}

  async allMines(): Promise<MineRecord[]> {
    const [sa, bw, na, zw, zm, mz] = await Promise.all([
      this.saRepo.find(),
      this.bwRepo.find(),
      this.naRepo.find(),
      this.zwRepo.find(),
      this.zmRepo.find(),
      this.mzRepo.find(),
    ]);
    return [
      ...sa.map((m) => toRecord("South Africa", m)),
      ...bw.map((m) => toRecord("Botswana", m)),
      ...na.map((m) => toRecord("Namibia", m)),
      ...zw.map((m) => toRecord("Zimbabwe", m)),
      ...zm.map((m) => toRecord("Zambia", m)),
      ...mz.map((m) => toRecord("Mozambique", m)),
    ];
  }

  async byCountry(country: Country): Promise<MineRecord[]> {
    if (country === "South Africa") {
      const rows = await this.saRepo.find();
      return rows.map((m) => toRecord(country, m));
    }
    if (country === "Botswana") {
      const rows = await this.bwRepo.find();
      return rows.map((m) => toRecord(country, m));
    }
    if (country === "Namibia") {
      const rows = await this.naRepo.find();
      return rows.map((m) => toRecord(country, m));
    }
    if (country === "Zimbabwe") {
      const rows = await this.zwRepo.find();
      return rows.map((m) => toRecord(country, m));
    }
    if (country === "Zambia") {
      const rows = await this.zmRepo.find();
      return rows.map((m) => toRecord(country, m));
    }
    const mzRows = await this.mzRepo.find();
    return mzRows.map((m) => toRecord(country, m));
  }
}

function toRecord(country: Country, mine: SaMine | CountryMineBase): MineRecord {
  // SaMine and CountryMineBase have slightly different optional-field shapes
  // (sa_mines uses 'province', country tables use 'region') — normalise here
  // so callers see one consistent record.
  const sa = mine as SaMine;
  const cm = mine as CountryMineBase;
  const region = cm.region ?? sa.province ?? undefined;
  return {
    country,
    id: mine.id,
    mineName: mine.mineName,
    operatingCompany: mine.operatingCompany,
    region,
    district: cm.district ?? sa.district ?? null,
    nearestTown: cm.nearestTown ?? null,
    physicalAddress: cm.physicalAddress ?? sa.physicalAddress ?? null,
    latitude: mine.latitude ?? null,
    longitude: mine.longitude ?? null,
  };
}
