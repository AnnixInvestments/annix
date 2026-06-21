export interface RubberBondingSelectionRow {
  group: string;
  rubber: string;
  products: string[];
  spreadRate: string;
  application: string;
}

export interface RubberBondingAgentNote {
  product: string;
  notes: string;
}

/**
 * Adhesive selection guide (Impilo HeroBond / HeroPrime system) mapping the
 * rubber type + cure state to the recommended bonding agents, spread rate and
 * application notes. Reference data shown on the Bonding Agents page.
 */
export const RUBBER_BONDING_SELECTOR_GUIDE: RubberBondingSelectionRow[] = [
  {
    group: "Uncured rubber to metal",
    rubber: "Non UV resistant — to be chemical cured",
    products: [
      "HeroBond 080 (Orange Primer)",
      "HeroBond 082 (Black cover coat)",
      "HeroBond 086 (Black tie coat)",
      "Hero Cure (Curing agent)",
    ],
    spreadRate: "080: 10–11 m²/L · 082: 9–10 m²/L · 086: 1 coat 6.2, 2 coats 3.1 m²/L",
    application:
      "Min drying 30 min between coats at room temp. One coat on steel, one on rubber. Curing 6–14 days.",
  },
  {
    group: "Uncured rubber to metal",
    rubber: "UV resistant — to be chemical cured",
    products: [
      "HeroBond 089 (Green Primer)",
      "HeroBond 090 (Red Cover Coat)",
      "HeroBond 086 (Black tie coat)",
      "Hero Cure (Curing agent)",
    ],
    spreadRate: "089: 11 m²/L · 090: 20 m²/L · 086: 1 coat 6.2, 2 coats 3.1 m²/L",
    application: "1 hour to dry in between. One coat on steel, one on rubber. Curing 6–14 days.",
  },
  {
    group: "Uncured rubber to metal",
    rubber: "To be steam cured",
    products: [
      "HeroBond 080 (Orange Primer)",
      "HeroBond 082 (Black cover coat)",
      "HeroBond 086 (Black tie coat)",
    ],
    spreadRate: "080: 10–11 m²/L · 082: 9–10 m²/L · 086: 1 coat 6.2, 2 coats 3.1 m²/L",
    application: "Min drying 30 min between coats at room temp. One coat on steel, one on rubber.",
  },
  {
    group: "Pre-cured rubber",
    rubber: "Pre-cured rubber to metal",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 200 kit"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 200: ±700 g/m² (depends on surface roughness)",
    application: "Primer 20–30 min drying at room temp. 50 ml hardener per 1 kg.",
  },
  {
    group: "Cured rubber sheeting",
    rubber: "Cured to metal — 50 shore and higher",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 200 kit"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 200: ±700 g/m² (depends on surface roughness)",
    application: "Primer 20–30 min drying at room temp. 50 ml hardener per 1 kg.",
  },
  {
    group: "Cured rubber sheeting",
    rubber: "Cured to metal — 40 shore",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 400 kit (Red resin & hardener)"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 400: 5 m²/L per coat @ 20µm DFT",
    application: "Primer 20–30 min drying at room temp.",
  },
  {
    group: "Butyl rubber sheeting",
    rubber: "Butyl cured to metal",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 200 kit"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 200: ±700 g/m² (depends on surface roughness)",
    application: "Primer 20–30 min drying at room temp.",
  },
  {
    group: "EPDM rubber sheeting",
    rubber: "EPDM cured to metal",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 400 kit (Red resin & hardener)"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 400: 5 m²/L per coat @ 20µm DFT",
    application: "Primer 20–30 min drying at room temp.",
  },
  {
    group: "Hypalon (CSM) rubber sheeting",
    rubber: "Cured & pre-cured Hypalon to metal",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 200 kit"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 200: ±700 g/m² (depends on surface roughness)",
    application: "Primer 20–30 min drying at room temp.",
  },
  {
    group: "Nitrile rubber",
    rubber: "Nitrile cured to metal",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 200 kit"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 200: ±700 g/m² (depends on surface roughness)",
    application: "Primer 20–30 min drying at room temp.",
  },
  {
    group: "Nitrile rubber",
    rubber: "Nitrile to Nitrile",
    products: ["HeroPrime 105 (Grey Metal Primer)"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT",
    application: "HeroPrime 105 works as the bonding agent.",
  },
  {
    group: "Ebonite rubber",
    rubber: "Cured ebonite to metal",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 200 kit"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 200: ±700 g/m² (depends on surface roughness)",
    application: "Primer 20–30 min drying at room temp.",
  },
  {
    group: "Ebonite rubber",
    rubber: "Uncured ebonite",
    products: ["HeroBond 089 / 090 / 086", "Hero Cure"],
    spreadRate: "See uncured-to-metal coverages",
    application: "Chemical-cure system.",
  },
  {
    group: "Neoprene rubber",
    rubber: "Neoprene cured to metal",
    products: ["HeroPrime 105 (Grey Metal Primer)", "HeroBond 200 kit"],
    spreadRate: "105: 12.0 m²/L @ 10µm DFT · 200: ±700 g/m² (depends on surface roughness)",
    application: "Primer 20–30 min drying at room temp.",
  },
];

export const RUBBER_BONDING_AGENT_NOTES: RubberBondingAgentNote[] = [
  {
    product: "HeroPrime 105 Primer",
    notes:
      "Metal primer for cover coats (HeroBond 200/300/400/450). Bonds a wide variety of vulcanised and unvulcanised rubber compounds to metal and other rigid substrates.",
  },
  {
    product: "HeroBond 200 kit",
    notes:
      "Cured rubber to itself, primed metal or primed concrete; cold-splicing textile-reinforced conveyor belts; chemical-cure rubber to primed metal/concrete.",
  },
  {
    product: "HeroBond 300 kit",
    notes:
      "Non-flammable, Trichloroethylene-free two-part. Cold bonding of pre-cured rubber sheeting and pulley lagging; repairs to rubber-lined vessels. Rubber/textile to rubber/metal/textile.",
  },
  {
    product: "HeroBond 400 / 450 kit",
    notes:
      "Two-part polychloroprene adhesive. Cured rubber to itself/metal/primer top-coat; cured elastomers to fabrics/textiles; soft NR gum, EPDM and butyl. Prime metal with HeroPrime 105 first.",
  },
  {
    product: "Solvents",
    notes: "Toluene cleans uncured rubber; MEK cleans cured rubber.",
  },
  {
    product: "Stainless steel prep",
    notes: "Blast with aluminium-oxide grit, clean substrate with MEK, apply primer immediately.",
  },
];
