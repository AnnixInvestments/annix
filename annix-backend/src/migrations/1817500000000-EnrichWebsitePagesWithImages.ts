import { type MigrationInterface, type QueryRunner } from "typeorm";

const productsContent = `## Rubber Compound

![Rubber compound](/au-industries/aui-rubber02.jpg)

AU has created its own rubber formulations to offer the highest quality rubber compound, sheeting and other rubber products in each category it supplies.

Our aim is to raise the bar in terms of quality and life span of our products which in turn will give better value for money, and less down time in mining operations globally. We have the ability to offer custom made compounds and products that can be tweaked to match each individual processing plant, thus streamlining the surface protection of the steel work and increasing the lifespan of those items which our rubber is applied to.

[Enquire Here](/au-industries/contact)

---

## Rubber Sheeting

![Rubber sheeting](/au-industries/aui-rubber03.jpg)

At AU Industries we pride ourselves on offering the highest quality of rubber sheeting available for each level required by the industry, at the best possible prices for the quality on offer. We have extensive experience in the quality of product that is required and pride ourselves in our delivery times on orders placed.

Our current portfolio includes a low abrasion loss 40 shore Natural Rubber Red & Black designed to extend the life of pipes and tanks in a slurry application, a high quality 60 shore Natural Rubber Red & Black great for tanks and chutes which have larger particle sizes and with a better impact resistance, a 50 Shore Bromobutyl which necessitate superior resistance to mineral acids, saltwater, rainwater, acidic or alkaline solutions, and a 60 Shore Nitrile that exhibits excellent resistance to oils, fuels, and hydrocarbons, making it suitable for applications involving prolonged exposure to such substances.

We also have a premium range of rubber sheeting and can offer custom made solutions to suit the particular process and material that is running through the mining plant.

[Enquire Here](/au-industries/contact)

---

## Products

![Ceramic embedded rubber products](/au-industries/aui-rubber04.jpg)

Engineered for the toughest mining environments, our rubber products deliver unmatched durability and performance. From heavy-duty seals and gaskets to advanced moulded components, we provide solutions that stand up to extreme abrasion, impact, and chemical exposure. Our Ceramic Embedded Wear Pads offer superior wear resistance, extending equipment life and reducing maintenance downtime. Trusted by mining professionals, our products are built to keep your operations running longer, safer, and more efficiently.

Our mining process is built on precision, safety, and efficiency — ensuring reliable material handling and reduced downtime in even the most demanding environments. Supporting this is our dedicated Rubber R&D Department, where innovation meets performance. Through continuous research and material testing, we develop advanced rubber compounds tailored for extreme mining conditions. From concept to application, our team drives solutions that enhance durability, reduce wear, and push the boundaries of what's possible in mining technology.

[Enquire Here](/au-industries/contact)

---

## Projects and Services

AU, with its partners and combined 40 years' experience, can offer a variety of difference Services to its clients.

Whether it be fabricating, lining and coating replacement parts for any area of the mines, or full project fabrication, management and quality control, we are able to call upon our various partners to complete small and large projects.

We can advise on correct pressure ratings of pipes and fittings, rubber type and thickness to different lifespans, external or internal coating specifications and other items such as pumps, valves and spares needed in the mining process. We also offer other lining capabilities such as ceramic & silicon carbide linings, Polyurethane and HDPE linings, and Straight supply of HDPE & PVC piping and fittings.

[Request a Quote](/au-industries/quote)

---

## Site Work and Maintenance

AU has partnered with multiple approved site maintenance teams in different regions of South Africa, to be able to offer our high-end products in onsite situations and solutions.

We also have partners in other countries such as Mozambique, Zambia, Namibia, Botswana & Zimbabwe, among other countries, that enable us together to complete site and project work into Africa.

[Request More Information](/au-industries/contact)
`;

const galleryContent = `Below are a few images of our products, projects and services

---

### Fittings lined with AU 40 Black for a mine in Namibia — July 2025

![AU 40 Black rubber lined flanged fitting for Namibian mine](/au-industries/gallery/gallery52.jpg)
![Interior view of AU 40 Black rubber lined pipe fitting](/au-industries/gallery/gallery53.jpg)
![Completed AU 40 Black lined fittings ready for dispatch to Namibia](/au-industries/gallery/gallery54.jpg)

---

### Fittings lined with AU premium 60 Shore for a mine in Mozambique — July 2025

![AU premium 60 Shore rubber lined fitting for Mozambique mine](/au-industries/gallery/gallery50.jpg)
![Finished 60 Shore rubber lined pipe fittings](/au-industries/gallery/gallery51.jpg)

---

### Ceramic Embedded Rubber hoses for a mine in Mozambique — July 2025

![Ceramic embedded rubber hose section showing embedded tiles](/au-industries/gallery/gallery47.jpg)
![Ceramic rubber hose assembly for Mozambique mining operation](/au-industries/gallery/gallery48.jpg)
![Completed ceramic embedded rubber hoses ready for shipping](/au-industries/gallery/gallery49.jpg)

---

### Pipes lined with 12mm AU 40 Red for a mine in Limpopo — July 2025

![12mm AU 40 Red rubber lined pipe interior view](/au-industries/gallery/gallery44.jpg)
![Red rubber lined steel pipe for Limpopo mine project](/au-industries/gallery/gallery45.jpg)
![Batch of AU 40 Red lined pipes ready for delivery to Limpopo](/au-industries/gallery/gallery46.jpg)

---

### Pipes and fittings lined with AU 40 Black for a uranium mine in Namibia — June 2025

![AU 40 Black lined pipe for uranium mine in Namibia](/au-industries/gallery/gallery41.jpg)
![Rubber lined fitting showing black natural rubber interior](/au-industries/gallery/gallery42.jpg)
![Completed lined pipes and fittings for Namibian uranium project](/au-industries/gallery/gallery43.jpg)

---

### Pipes lined with a custom compound developed by AU for their process in West Africa — June 2025

![Custom compound rubber lined pipe for West Africa project](/au-industries/gallery/gallery38.jpg)
![AU custom rubber compound lining applied to steel pipe](/au-industries/gallery/gallery39.jpg)
![Lined pipes with bespoke AU compound for West African mine](/au-industries/gallery/gallery40.jpg)

---

### HDPE project for a customer in Mozambique — June 2025

![HDPE pipe sections fabricated for Mozambique project](/au-industries/gallery/gallery35.jpg)
![HDPE piping installation components for mining operation](/au-industries/gallery/gallery36.jpg)
![Completed HDPE pipe delivery for Mozambique customer](/au-industries/gallery/gallery37.jpg)

---

### Various rolls of AU rubber delivered — June 2025

![Rolls of AU natural rubber sheeting on delivery truck](/au-industries/gallery/gallery32.jpg)
![Stacked rubber sheeting rolls in AU Industries warehouse](/au-industries/gallery/gallery33.jpg)
![AU rubber rolls prepared for customer delivery](/au-industries/gallery/gallery34.jpg)

---

### AU A38 Pink Rubber rolls being manufactured — May 2025

![AU A38 Pink rubber sheeting on manufacturing calender](/au-industries/gallery/gallery29.jpg)
![Pink rubber compound being processed through rolling mill](/au-industries/gallery/gallery30.jpg)
![Finished AU A38 Pink rubber rolls after manufacturing](/au-industries/gallery/gallery31.jpg)

---

### AU's premium A38 pink rubber compound — May 2025

![AU premium A38 pink rubber compound block](/au-industries/gallery/gallery26.jpg)
![A38 pink rubber compound showing colour and texture](/au-industries/gallery/gallery27.jpg)
![Batch of AU A38 premium pink rubber compound](/au-industries/gallery/gallery28.jpg)

---

### New ceramic embedded rubber wear panels — May 2025

![Ceramic embedded rubber wear panel showing tile pattern](/au-industries/gallery/gallery22.jpg)
![Close-up of ceramic tiles bonded into rubber wear panel](/au-industries/gallery/gallery23.jpg)
![Set of ceramic embedded rubber panels for chute lining](/au-industries/gallery/gallery25.jpg)

---

### AU 40 shore black natural rubber compound — April 2025

![AU 40 shore black natural rubber compound sample](/au-industries/gallery/gallery12.jpg)
![Black rubber compound block showing consistency](/au-industries/gallery/gallery13.jpg)
![AU 40 shore black compound prepared for sheeting production](/au-industries/gallery/gallery15.jpg)

---

### AU 40 shore black rubber sheet manufacturing — April 2025

![Black rubber sheeting on calender during manufacturing](/au-industries/gallery/gallery14.jpg)
![40 shore black rubber sheet being rolled after calendering](/au-industries/gallery/gallery16.jpg)
![Finished AU 40 shore black rubber sheet rolls](/au-industries/gallery/gallery17.jpg)

---

### Red 40 shore pipe for a platinum mine in Mpumalanga — Oct 2024

![AU Red 40 shore rubber lined pipe for platinum mine](/au-industries/gallery/gallery02.jpg)
![Interior red rubber lining of steel pipe for Mpumalanga mine](/au-industries/gallery/gallery04.jpg)
![Completed red rubber lined pipes for platinum mine delivery](/au-industries/gallery/gallery20.jpg)

---

### AU red rubber lined fittings for a titanium mine in Mozambique — Sept 2024

![Red rubber lined elbow fitting for titanium mine](/au-industries/gallery/projectgallery17.jpg)
![Rubber lined tee fitting for Mozambique titanium project](/au-industries/gallery/projectgallery18.jpg)
![Set of red lined fittings ready for Mozambique shipment](/au-industries/gallery/projectgallery19.jpg)

---

### AU red rubber lined fittings for a titanium mine in Mozambique — July 2024

![Red rubber lined reducer for titanium mine piping system](/au-industries/gallery/gallery19.jpg)
![Large diameter rubber lined fitting for Mozambique mine](/au-industries/gallery/projectgallery13.jpg)
![Completed rubber lined fittings batch for titanium project](/au-industries/gallery/projectgallery14.jpg)

---

### Rubber Lined Pipes and Chutes for a Titanium Mine in Mozambique — June 2022

![Rubber lined chute fabrication for Mozambique titanium mine](/au-industries/gallery/projectgallery01.jpg)
![Large rubber lined pipe section for mineral processing](/au-industries/gallery/projectgallery05.jpg)
![Completed rubber lined pipes and chutes for titanium mine](/au-industries/gallery/projectgallery10.jpg)

---

### Rubber lined and HDPE pipes for copper mine in Limpopo — Sept 2021

![Rubber lined steel pipe for Limpopo copper mine](/au-industries/gallery/gallery05.jpg)
![HDPE pipe sections prepared for copper mine installation](/au-industries/gallery/gallery08.jpg)
![Combined rubber lined and HDPE pipe delivery for copper mine](/au-industries/gallery/projectgallery23.jpg)
`;

export class EnrichWebsitePagesWithImages1817500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE website_page SET content = $1, hero_image_url = $2 WHERE slug = $3",
      [productsContent, "/au-industries/AUI-banner7.jpg", "products-and-services"],
    );

    await queryRunner.query(
      "UPDATE website_page SET content = $1, hero_image_url = $2 WHERE slug = $3",
      [galleryContent, "/au-industries/AUI-banner8.jpg", "gallery"],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE website_page SET hero_image_url = NULL WHERE slug IN ($1, $2)",
      ["products-and-services", "gallery"],
    );
  }
}
