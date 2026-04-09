import { type MigrationInterface, type QueryRunner } from "typeorm";

const updatedContent = `## Rubber Compound

AU Industries has developed proprietary rubber formulations to deliver superior quality rubber products. We aim to raise the bar in terms of quality and life span while providing better value and reduced downtime for mining operations globally. We offer customisable compounds tailored to individual processing plants.

[ENQUIRE HERE](/au-industries/contact)

## Rubber Sheeting

We provide premium rubber sheeting at competitive pricing with reliable delivery. Our current inventory includes:

- **40 Shore Natural Rubber** (Red & Black) — low abrasion loss for pipes and tanks in slurry applications
- **60 Shore Natural Rubber** (Red & Black) — impact-resistant for tanks and chutes with larger particles
- **50 Shore Bromobutyl** — resists mineral acids, saltwater, and alkaline solutions
- **60 Shore Nitrile** — excellent resistance to oils, fuels, and hydrocarbons

Custom solutions are available for specialised mining applications.

[ENQUIRE HERE](/au-industries/contact)

## Engineered Rubber Products

We manufacture engineered rubber solutions for extreme mining conditions, including seals, gaskets, and moulded components. Our Ceramic Embedded Wear Pads provide enhanced wear resistance and extended equipment lifespan.

AU maintains a dedicated Rubber R&D Department focused on developing advanced compounds through continuous research and material testing.

[ENQUIRE HERE](/au-industries/contact)

## Projects and Services

With 40 years combined experience, we offer:

- Fabrication, lining, and coating services
- Full project management and quality control
- Consultation on pipe pressure ratings and rubber specifications
- Ceramic, silicon carbide, polyurethane, and HDPE linings
- HDPE and PVC piping supply

[REQUEST A QUOTE](/au-industries/quote)

## Site Work and Maintenance

AU partners with approved maintenance teams across South Africa and neighbouring African countries (Mozambique, Zambia, Namibia, Botswana, Zimbabwe) for onsite solutions.

[REQUEST MORE INFORMATION](/au-industries/contact)
`;

export class UpdateProductsPageWithButtons1817400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE website_page SET content = $1 WHERE slug = $2", [
      updatedContent,
      "products-and-services",
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const originalContent = `## Rubber Compound

AU Industries has developed proprietary rubber formulations to deliver superior quality rubber products. We aim to raise the bar in terms of quality and life span while providing better value and reduced downtime for mining operations globally. We offer customisable compounds tailored to individual processing plants.

## Rubber Sheeting

We provide premium rubber sheeting at competitive pricing with reliable delivery. Our current inventory includes:

- **40 Shore Natural Rubber** (Red & Black) — low abrasion loss for pipes and tanks in slurry applications
- **60 Shore Natural Rubber** (Red & Black) — impact-resistant for tanks and chutes with larger particles
- **50 Shore Bromobutyl** — resists mineral acids, saltwater, and alkaline solutions
- **60 Shore Nitrile** — excellent resistance to oils, fuels, and hydrocarbons

Custom solutions are available for specialised mining applications.

## Engineered Rubber Products

We manufacture engineered rubber solutions for extreme mining conditions, including seals, gaskets, and moulded components. Our Ceramic Embedded Wear Pads provide enhanced wear resistance and extended equipment lifespan.

AU maintains a dedicated Rubber R&D Department focused on developing advanced compounds through continuous research and material testing.

## Projects and Services

With 40 years combined experience, we offer:

- Fabrication, lining, and coating services
- Full project management and quality control
- Consultation on pipe pressure ratings and rubber specifications
- Ceramic, silicon carbide, polyurethane, and HDPE linings
- HDPE and PVC piping supply

## Site Work and Maintenance

AU partners with approved maintenance teams across South Africa and neighbouring African countries (Mozambique, Zambia, Namibia, Botswana, Zimbabwe) for onsite solutions.
`;
    await queryRunner.query("UPDATE website_page SET content = $1 WHERE slug = $2", [
      originalContent,
      "products-and-services",
    ]);
  }
}
