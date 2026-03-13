import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { GlossaryTerm } from "../entities/glossary-term.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";

const DEFAULT_TERMS: Array<{
  abbreviation: string;
  term: string;
  definition: string;
  category: string;
}> = [
  {
    abbreviation: "DFT",
    term: "Dry Film Thickness",
    definition:
      "The thickness of a coating measured after it has dried and cured. Measured in micrometres (\u00b5m). Critical for ensuring corrosion protection meets specification requirements.",
    category: "Coating",
  },
  {
    abbreviation: "CVN",
    term: "Charpy V-Notch",
    definition:
      "An impact test that measures the energy absorbed by a material during fracture at a specified temperature. Results are measured in Joules. Required for PSL2 pipe specifications.",
    category: "Testing",
  },
  {
    abbreviation: "PSL",
    term: "Product Specification Level",
    definition:
      "API 5L classification for line pipe. PSL1 is standard quality with basic requirements. PSL2 has stricter chemistry limits, mandatory impact testing, and 100% NDT coverage.",
    category: "Standards",
  },
  {
    abbreviation: "NB",
    term: "Nominal Bore",
    definition:
      "The approximate internal diameter of a pipe, used as a standard reference size. Expressed in millimetres (mm). Does not represent the exact internal measurement.",
    category: "Dimensions",
  },
  {
    abbreviation: "OD",
    term: "Outside Diameter",
    definition:
      "The external diameter of a pipe or fitting, measured in millimetres (mm). Used together with wall thickness to calculate the internal bore.",
    category: "Dimensions",
  },
  {
    abbreviation: "m\u00b2",
    term: "Square Metres",
    definition:
      "Unit of area measurement used for coating and rubber lining calculations. Determines the amount of material needed to cover pipe surfaces.",
    category: "Units",
  },
  {
    abbreviation: "FBE",
    term: "Fusion Bonded Epoxy",
    definition:
      "A thermosetting powder coating applied to pipe surfaces for corrosion protection. Applied using heat (typically 180-250\u00b0C) to fuse the epoxy to the steel surface.",
    category: "Coating",
  },
  {
    abbreviation: "SRL",
    term: "Single Random Length",
    definition:
      "Standard pipe length range of 4.88m to 6.71m (16ft to 22ft). The most common delivery length for smaller pipe sizes.",
    category: "Dimensions",
  },
  {
    abbreviation: "DRL",
    term: "Double Random Length",
    definition:
      "Standard pipe length range of 10.67m to 12.8m (35ft to 42ft). Preferred for larger diameter pipes to minimise the number of welds.",
    category: "Dimensions",
  },
  {
    abbreviation: "NDT",
    term: "Non-Destructive Testing",
    definition:
      "Inspection methods that examine materials without causing damage. Common methods include Radiographic Testing (RT), Ultrasonic Testing (UT), Magnetic Particle Testing (MT), and Penetrant Testing (PT).",
    category: "Testing",
  },
  {
    abbreviation: "NACE",
    term: "NACE International Standard",
    definition:
      "Corrosion engineering standards, particularly MR0175/ISO 15156 for sour service (H\u2082S) environments. Specifies material hardness limits and testing requirements for oil and gas applications.",
    category: "Standards",
  },
  {
    abbreviation: "HRC",
    term: "Hardness Rockwell C",
    definition:
      "A hardness measurement scale. For sour service (NACE) applications, carbon steel is limited to a maximum of 22 HRC to prevent sulphide stress cracking.",
    category: "Testing",
  },
  {
    abbreviation: "SSC",
    term: "Sulphide Stress Cracking",
    definition:
      "A form of hydrogen embrittlement that occurs in high-strength steels exposed to hydrogen sulphide (H\u2082S). Prevented by limiting material hardness and using NACE-compliant materials.",
    category: "Materials",
  },
  {
    abbreviation: "CE",
    term: "Carbon Equivalent",
    definition:
      "A formula that expresses the combined effect of carbon and other alloying elements on steel weldability. Values \u22640.43 indicate good weldability for most applications.",
    category: "Materials",
  },
  {
    abbreviation: "BOQ",
    term: "Bill of Quantities",
    definition:
      "A consolidated document listing all items from an RFQ, grouped for supplier pricing. Shows quantities, specifications, and material requirements needed for quotation.",
    category: "Commercial",
  },
  {
    abbreviation: "RFQ",
    term: "Request for Quote",
    definition:
      "A formal document sent by a customer requesting pricing for specific pipe, fittings, and fabrication work. Contains detailed technical specifications and delivery requirements.",
    category: "Commercial",
  },
  {
    abbreviation: "ID",
    term: "Internal Diameter",
    definition:
      "The inside diameter of a pipe, calculated as OD minus twice the wall thickness. Critical for flow calculations and rubber lining specifications.",
    category: "Dimensions",
  },
  {
    abbreviation: "WT",
    term: "Wall Thickness",
    definition:
      "The thickness of a pipe wall, measured in millimetres. Determined by the pipe schedule and affects pressure rating, weight, and cost.",
    category: "Dimensions",
  },
  {
    abbreviation: "CPO",
    term: "Customer Purchase Order",
    definition:
      "A formal order from a customer authorising work to proceed. Used to track fulfilment against ordered quantities and link job cards to commercial commitments.",
    category: "Commercial",
  },
  {
    abbreviation: "JC",
    term: "Job Card",
    definition:
      "A work order document that tracks a specific fabrication or processing job through the workshop. Contains line items, coating requirements, material allocations, and approval workflow.",
    category: "Workflow",
  },
  {
    abbreviation: "SOH",
    term: "Stock on Hand",
    definition:
      "The current quantity of an inventory item available in the warehouse. Used for stock level monitoring and reorder alerts.",
    category: "Inventory",
  },
  {
    abbreviation: "QR",
    term: "Quick Response Code",
    definition:
      "A two-dimensional barcode used on staff badges and inventory items for rapid scanning during stock issuance and dispatch operations.",
    category: "Inventory",
  },
];

@Injectable()
export class GlossaryService {
  constructor(
    @InjectRepository(GlossaryTerm)
    private readonly termRepo: Repository<GlossaryTerm>,
  ) {}

  async termsForCompany(companyId: number): Promise<GlossaryTerm[]> {
    const customTerms = await this.termRepo.find({
      where: { companyId },
      order: { abbreviation: "ASC" },
    });

    const customAbbreviations = new Set(customTerms.map((t) => t.abbreviation.toUpperCase()));

    const defaults = DEFAULT_TERMS.filter(
      (d) => !customAbbreviations.has(d.abbreviation.toUpperCase()),
    ).map((d) => ({
      id: 0,
      abbreviation: d.abbreviation,
      term: d.term,
      definition: d.definition,
      category: d.category,
      companyId,
      isCustom: false,
      company: null as unknown as StockControlCompany,
      createdAt: now().toJSDate(),
      updatedAt: now().toJSDate(),
    }));

    return [...customTerms, ...defaults].sort((a, b) =>
      a.abbreviation.localeCompare(b.abbreviation),
    );
  }

  async upsertTerm(
    companyId: number,
    dto: {
      abbreviation: string;
      term: string;
      definition: string;
      category?: string | null;
    },
  ): Promise<GlossaryTerm> {
    const existing = await this.termRepo.findOne({
      where: { companyId, abbreviation: dto.abbreviation },
    });

    if (existing) {
      existing.term = dto.term;
      existing.definition = dto.definition;
      existing.category = dto.category ?? null;
      return this.termRepo.save(existing);
    }

    return this.termRepo.save(
      this.termRepo.create({
        companyId,
        abbreviation: dto.abbreviation,
        term: dto.term,
        definition: dto.definition,
        category: dto.category ?? null,
        isCustom: true,
      }),
    );
  }

  async removeTerm(companyId: number, abbreviation: string): Promise<void> {
    await this.termRepo.delete({ companyId, abbreviation });
  }

  async resetToDefaults(companyId: number): Promise<void> {
    await this.termRepo.delete({ companyId });
  }
}
