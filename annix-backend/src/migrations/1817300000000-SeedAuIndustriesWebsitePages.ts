import { type MigrationInterface, type QueryRunner } from "typeorm";

const pages = [
  {
    slug: "home",
    title: "Rubber Products, Linings & Mining Solutions",
    metaTitle: "AU Industries - Rubber Products, Linings & Mining Solutions in Boksburg",
    metaDescription:
      "AU Industries specialises in rubber lining, rubber sheeting, HDPE lining, and industrial rubber solutions for mining, chemical processing, and water treatment in South Africa.",
    sortOrder: 0,
    isPublished: true,
    isHomePage: true,
    content: `## Who We Are

AU Industries was founded to provide high-quality rubber products, linings, and mining solutions at competitive prices with fast turnaround times. The company brings together more than 40 years of combined industry experience.

We are a comprehensive supplier for mining operations, offering equipment, spare parts, and project support. Our capabilities span rubber lining installation, ceramic lining, HDPE lining, and uPVC pipe solutions for various mining infrastructure components including pipes, tanks, chutes, pulleys, and pumps.

We partner with local manufacturers to produce custom rubber compounds and precision mouldings. Our product offerings include rubber sheeting, wear pads, hoses, and ceramic-embedded rubber products. We also supply and fabricate HDPE pipes, uPVC pipes, pumps, valves, and dust suppression powder.

## Our Services

- Full Mining Projects
- Small Projects and Spares
- Rubber Compound & Sheeting
- Rubber Linings & Mouldings
- Pipe, Tank & Chute Fabrication
- Other Mining Consumables

## Why AU Industries?

- **40+ years** combined industry experience
- **Custom rubber compounds** developed in-house
- **Competitive pricing** with fast turnaround times
- **Onsite services** across South Africa and neighbouring countries
`,
  },
  {
    slug: "products-and-services",
    title: "Products, Projects & Services",
    metaTitle: "Rubber Products & Mining Services - AU Industries",
    metaDescription:
      "Rubber compound, sheeting, linings, mouldings, HDPE piping, ceramic linings, and full mining project services from AU Industries in Boksburg.",
    sortOrder: 1,
    isPublished: true,
    isHomePage: false,
    content: `## Rubber Compound

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
`,
  },
  {
    slug: "gallery",
    title: "Gallery",
    metaTitle: "Project Gallery - AU Industries",
    metaDescription:
      "View our latest rubber lining, HDPE, and mining project work across South Africa, Mozambique, Namibia, and West Africa.",
    sortOrder: 2,
    isPublished: true,
    isHomePage: false,
    content: `## Recent Projects

### July 2025
- Fittings lined with AU 40 Black for a mine in Namibia
- Fittings lined with AU premium 60 Shore for a mine in Mozambique
- Ceramic Embedded Rubber hoses for a mine in Mozambique
- Pipes lined with 12mm AU 40 Red for a mine in Limpopo

### June 2025
- Pipes and fittings lined with AU 40 Black for a uranium mine in Namibia
- Pipes lined with a custom compound developed by AU for a process in West Africa
- HDPE project for a customer in Mozambique
- Various rolls of AU rubber delivered

### May 2025
- AU A38 Pink Rubber rolls being manufactured
- AU's premium A38 pink rubber compound
- New ceramic embedded rubber wear panels

### April 2025
- AU 40 shore black natural rubber compound
- AU 40 shore black rubber sheet manufacturing

### Earlier Projects
- Red 40 shore pipe for a platinum mine in Mpumalanga — October 2024
- AU red rubber lined fittings for a titanium mine in Mozambique — September 2024
- AU red rubber lined fittings for a titanium mine in Mozambique — July 2024
- Rubber Lined Pipes and Chutes for a Titanium Mine in Mozambique — June 2022
- Rubber lined & HDPE pipes for copper mine in Limpopo — September 2021

*Gallery images will be added shortly — we are migrating from our previous hosting provider.*
`,
  },
];

export class SeedAuIndustriesWebsitePages1817300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const page of pages) {
      const exists = await queryRunner.query("SELECT id FROM website_page WHERE slug = $1", [
        page.slug,
      ]);

      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO website_page (slug, title, meta_title, meta_description, content, sort_order, is_published, is_home_page)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            page.slug,
            page.title,
            page.metaTitle,
            page.metaDescription,
            page.content,
            page.sortOrder,
            page.isPublished,
            page.isHomePage,
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const page of pages) {
      await queryRunner.query("DELETE FROM website_page WHERE slug = $1", [page.slug]);
    }
  }
}
