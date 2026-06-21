import type { mongo } from "mongoose";

const COLLECTION = "website_page";

interface FaqItem {
  question: string;
  answer: string;
}

interface RelatedItem {
  title: string;
  description: string;
  href: string;
}

const SERVICE_FAQS: Record<string, FaqItem[]> = {
  "rubber-lining": [
    {
      question: "What rubber compounds does AU Industries use for tank and pipe lining?",
      answer:
        "We line with four standard compounds: 40 Shore natural rubber for fine slurry abrasion (pipes, cyclones), 60 Shore natural rubber for impact zones with larger particles (chutes, hoppers), Bromobutyl 50 Shore for acid and chemical exposure (CIL/CIP tanks, acid plants), and Nitrile 60 Shore for oil and fuel contact. Other custom compounds can be developed as needed with our R&D department. The right choice depends on particle size, pH, temperature, and flow rate — we run a site assessment before specifying.",
    },
    {
      question: "How long does rubber lining last in mining slurry applications?",
      answer:
        "Service life varies with slurry type, particle size, velocity, and chemistry, but properly specified 40 Shore lining typically delivers 12–36 months in slurry pipes. Our A38 pink premium compound extends this further in heavy abrasion zones, and our premium 60 Shore pink (high-silica) compound delivers cut-resistant performance for applications where sharp particles damage standard 60 Shore rubber. Bromobutyl and nitrile linings tend to outlast natural rubber where chemicals or oils are the failure mode.",
    },
    {
      question: "Do you install rubber lining on-site?",
      answer:
        "Yes. We provide on-site rubber lining services across South Africa, Mozambique, Namibia, Zambia, Botswana, and Zimbabwe. Our teams handle the full process including grit blasting up to SA 3 standard, bonded rubber application, and spark testing on site.",
    },
    {
      question: "How is the surface prepared before rubber lining?",
      answer:
        "All surfaces are grit blasted up to SA 3 standard before lining. Adhesion failure is the most common cause of premature lining failure, and SA 3 preparation ensures the bonding agent makes a clean mechanical and chemical bond with the substrate.",
    },
    {
      question: "What is rubber lining and how does it protect equipment?",
      answer:
        "Rubber lining is a bonded layer of abrasion- or chemical-resistant rubber applied to the inside of steel equipment — pipes, tanks, chutes, pumps, and valves. It moves wear and corrosion off the steel and into a replaceable rubber layer, so the equipment lasts far longer and the lining is renewed rather than the whole component. It's the standard way to protect plant in mining slurry, minerals processing, and chemical service.",
    },
    {
      question: "What thickness of rubber lining do I need?",
      answer:
        "Lining thickness is matched to the wear duty — typically 6mm for general slurry abrasion, stepping up to 10–12mm or more in high-wear zones such as pipe bends, reducers, cyclone feeds, and chute impact points where flow changes direction. We can increase thickness locally rather than over-lining the whole component, and confirm the specification against your particle size, velocity, and chemistry during the site assessment.",
    },
    {
      question: "Can you rubber line both new and existing equipment?",
      answer:
        "Yes. We line newly fabricated pipework, tanks, and fittings before they go into service, and we re-line worn equipment that has reached the end of its previous lining life. Existing items are stripped, grit blasted to SA 3 standard, and re-lined — often more cost-effective than replacing the steelwork.",
    },
    {
      question: "Which industries use AU Industries rubber lining?",
      answer:
        "Mining and minerals processing (gold, platinum, coal, copper, uranium, titanium), chemical processing, water and wastewater treatment, and general heavy industry. Any operation moving abrasive slurry, corrosive liquids, or handling bulk material through steel equipment benefits from rubber lining.",
    },
    {
      question: "Where is AU Industries based for rubber lining work?",
      answer:
        "Our fabrication and lining facility is in Anderbolt, Boksburg, on the East Rand of Gauteng. We line in our workshop and on-site, with fast collection and delivery across Gauteng (Boksburg, Benoni, Germiston, Johannesburg) and project coverage throughout South Africa and into Mozambique, Namibia, Zambia, Botswana, and Zimbabwe.",
    },
  ],
  "rubber-sheeting": [
    {
      question: "What thicknesses of rubber sheeting are available?",
      answer:
        "Standard rubber sheeting is available from 3mm to 25mm thickness across all our compounds (40 Shore, 60 Shore, A38 pink, bromobutyl, nitrile, premium 60 Shore pink high-silica). Custom thicknesses outside this range can be produced on request.",
    },
    {
      question: "What's the difference between 40 Shore and 60 Shore natural rubber sheeting?",
      answer:
        "40 Shore is softer and is designed for low-impact slurry abrasion in pipes, tanks, and cyclone feeds — it absorbs fine particle wear through its resilience. 60 Shore is harder and is designed for impact and gouge resistance in chutes, hoppers, and screen decks where larger particles cause cutting damage rather than rubbing wear.",
    },
    {
      question: "What is AU A38 Pink and how is it different from standard 40 Shore?",
      answer:
        "A38 Pink is our premium proprietary compound developed in-house through our R&D programme. It's engineered for extended wear life in aggressive abrasive environments and outperforms standard 40 Shore in comparative wear testing. It costs more per square metre but delivers fewer replacement cycles, making it cost-effective for hard-to-access lining locations.",
    },
    {
      question: "Can rubber sheeting be supplied in custom widths?",
      answer:
        "Our standard rolls are 1200mm wide × 12m long. We also manufacture custom widths from 800mm up to 1450mm in our Boksburg mill, which gives us full control over both width and thickness. Share the dimensions and compound type when requesting a quote.",
    },
  ],
  "rubber-compound": [
    {
      question: "Can AU Industries develop a custom rubber compound for our application?",
      answer:
        "Yes. We have a dedicated rubber R&D programme that develops custom formulations based on your specific operating conditions — particle size, slurry concentration, chemical exposure, impact energy, and temperature range. Lead times for custom development depend on complexity and test sample requirements — we'll give you a realistic estimate when you share the application details.",
    },
    {
      question: "What hardness range can you supply?",
      answer:
        "Our standard compound range covers 40 Shore through 60 Shore (Shore A scale). Within that range we can produce specific hardness values to match customer requirements, with a typical tolerance of ±5 Shore.",
    },
    {
      question: "Can you match a compound from another supplier?",
      answer:
        "We can often match a competitor compound on hardness, abrasion resistance, and visual appearance, but we cannot replicate proprietary formulations exactly without the original recipe. We typically recommend running comparative wear samples in your application before switching.",
    },
    {
      question: "What's the lead time for standard compound batches?",
      answer:
        "Standard compound batches (40 Shore, 60 Shore, A38, bromobutyl, nitrile, premium 60 Shore pink high-silica) are produced from stock. Typical lead times: custom steam-cured sheeting 1–2 weeks, pre-cured sheeting 2–3 weeks. Contact us with your specifications and we'll confirm a delivery date against current production schedule.",
    },
  ],
  "mining-solutions": [
    {
      question: "What mining equipment does AU Industries supply?",
      answer:
        "Our mining product range covers rubber wear solutions (lining, ceramic embedded rubber, wear pads), pumps and spares (slurry pumps, casings, impellers), valves (knife gate, butterfly, pinch, diaphragm), pipe and fabrication (steel, HDPE, uPVC), and consumables like dust suppression powder, conveyor accessories, fasteners and gaskets.",
    },
    {
      question: "Do you handle full mining projects or only supply parts?",
      answer:
        "Both. We can supply individual spares from stock for fast turnaround, and we also manage full mining projects from specification through to installation — including procurement, fabrication, on-site installation, commissioning, and ongoing maintenance contracts.",
    },
    {
      question: "Where in Africa does AU Industries operate?",
      answer:
        "We support mines across South Africa, Mozambique, Namibia, Zambia, Botswana, and Zimbabwe with on-site teams and logistics. Project-based work in West and East Africa (Tanzania, Burkina Faso, DRC, Ghana) is also available — contact us for site availability.",
    },
    {
      question: "Is AU Industries BEE certified?",
      answer:
        "Yes. AU Industries holds a BEE Level 4 certificate with 100% procurement recognition, making us a preferred supplier under most South African mining procurement policies.",
    },
  ],
  "conveyor-components": [
    {
      question: "What types of pulley lagging do you supply?",
      answer:
        "We supply four lagging patterns: plain rubber for non-drive and tail pulleys, diamond pattern for drive pulleys requiring better wet-grip, chevron pattern for drive pulleys with directional grip requirements, and ceramic-studded for high-tension drive pulleys in heavy-duty applications. Lagging is available in cold-bond and hot-vulcanised options.",
    },
    {
      question: "Can you re-lag conveyor pulleys on-site?",
      answer:
        "Yes — but cold-bond only for site work. Hot vulcanising is available only at our Boksburg factory, so pulleys requiring hot-bond lagging need to be sent in. On-site cold bonding avoids the cost and downtime of removing and transporting heavy pulleys, and is the preferred method for most site re-lagging jobs.",
    },
    {
      question: "What is ceramic-embedded rubber and when should I use it?",
      answer:
        "Ceramic embedded rubber combines the impact resistance of rubber with alumina ceramic tiles bonded into the surface. It's ideal for high-wear transfer points, chute linings, and hopper walls where standard rubber wears out too quickly — typical wear life is 3–5× that of plain rubber in extreme abrasion zones.",
    },
    {
      question: "Do you supply skirting and impact bars for loading zones?",
      answer:
        "Yes. We supply skirt rubber, skirt clamps, and impact bars / cradles for conveyor loading zones. Impact bars protect the belt from shock damage at transfer points and are typically supplied alongside chute lining when we re-line a transfer station — quoted as additional line items, not included in the base lining cost.",
    },
  ],
  "site-maintenance": [
    {
      question: "Do you offer scheduled maintenance contracts?",
      answer:
        "Yes. We offer maintenance contracts with scheduled lining inspections and replacements. Regular inspections identify wear before failure, preventing unplanned downtime and damage to underlying equipment. Contracts are typically structured as quarterly or biannual visits depending on operating intensity.",
    },
    {
      question: "How quickly can you mobilise a team for a breakdown?",
      answer:
        "For customers under maintenance contracts we typically mobilise within 24–48 hours depending on site location. For ad-hoc breakdowns mobilisation depends on team availability — call us as early as possible and we'll give you a realistic ETA.",
    },
    {
      question: "Can you support planned shutdowns?",
      answer:
        "Yes. Shutdown support is one of our core services. We pre-fabricate and pre-line components in our Boksburg facility before the shutdown so installation time on site is minimised. The more lead time you give us before the shutdown date, the more work can be prepped off-site.",
    },
    {
      question: "What surface preparation standard do you use?",
      answer:
        "All on-site rubber lining is preceded by grit blasting up to SA 3 standard using mobile blasting equipment. SA 3 is the international standard for very thorough metal preparation and is what bonded rubber lining adhesives are designed to bond to. For some site repairs a mechanical grinder can be used to prepare the surface for lining where blasting is impractical.",
    },
  ],
  "rubber-rolls": [
    {
      question: "Do you re-cover existing rubber rollers?",
      answer:
        "Yes. We provide roller re-covering services where existing rollers are stripped, inspected, and re-covered with the appropriate rubber compound. We re-cover conveyor rollers (drive, guide, pinch), printing and packaging rollers, steel processing rollers, and paper/board press rollers.",
    },
    {
      question: "What rubber compounds are available for rollers?",
      answer:
        "Our standard roller compounds are AU 40 Shore (red and black), AU 60 Shore (red and black), AU A38 pink premium, premium 60 Shore pink high-silica, bromobutyl for chemical resistance, and nitrile for oil/fuel resistance. We can also formulate custom compounds for specific applications.",
    },
    {
      question: "What's the lead time for roller recovering?",
      answer:
        "Standard re-covers typically take 1–2 weeks once the roller arrives at our Boksburg facility. Critical-path rollers can be expedited — let us know your requirements when requesting a quote.",
    },
    {
      question: "Can you supply rubber rolls in custom widths and thicknesses?",
      answer:
        "Yes. Sheeting rolls are produced in our Boksburg mill with full control over both width and thickness. Standard rolls are 1200mm wide × 12m long; custom widths from 800mm up to 1450mm can be produced. Standard thicknesses are 3mm to 25mm; dimensions outside these ranges can be produced on request.",
    },
  ],
  "hdpe-piping": [
    {
      question: "What HDPE pipe sizes do you supply?",
      answer:
        "We supply HDPE pipes in diameters from 20mm to 1000mm in pressure ratings from PN6.3 to PN25, in PE100 grade. PE100 is preferred over PE80 for higher pressures and longer service life.",
    },
    {
      question: "Do you fabricate HDPE fittings and spools?",
      answer:
        "Yes. We fabricate custom HDPE pipe spools and manifolds including multi-outlet headers, Y-pieces, and complex branch configurations. We also stock a complete range of butt-weld and electro-fusion fittings — elbows, tees, reducers, flanges, and stub ends — manufactured to SANS 1533 / ISO 4427.",
    },
    {
      question: "How long does HDPE pipe last?",
      answer:
        "HDPE has a 50+ year design life under normal operating conditions. Joints are butt-welded and are typically as strong as the parent pipe, so unlike steel piping there are no corrosion or rust failure modes that progress over time.",
    },
    {
      question: "Can HDPE be used for slurry transport in mining?",
      answer:
        "Yes. HDPE is widely used for tailings lines, process water, and slurry transport because it is corrosion resistant and has lower wall friction than steel, which reduces pumping energy. For high-abrasion slurry applications we can also supply rubber-lined HDPE or steel pipe as alternatives.",
    },
  ],
};

const RELATED_SOLUTIONS: Record<string, RelatedItem[]> = {
  "rubber-lining": [
    {
      title: "Rubber Lined Mining Pipework",
      description: "Abrasion-resistant rubber lined pipe, bends, and fittings for slurry duty.",
      href: "/rubber-lined-mining-pipework",
    },
    {
      title: "Industrial Wear Lining",
      description: "Rubber and ceramic-backed wear lining for mining and heavy industry.",
      href: "/industrial-wear-lining",
    },
  ],
  "mining-solutions": [
    {
      title: "Rubber Lined Mining Pipework",
      description: "Fabricated and lined slurry pipework, bends, and fittings from Boksburg.",
      href: "/rubber-lined-mining-pipework",
    },
    {
      title: "Industrial Wear Lining",
      description: "Wear lining matched to the abrasion, impact, or corrosion mechanism.",
      href: "/industrial-wear-lining",
    },
  ],
  "rubber-sheeting": [
    {
      title: "Industrial Wear Lining",
      description: "Rubber and ceramic-backed wear lining for plant and equipment.",
      href: "/industrial-wear-lining",
    },
  ],
  "conveyor-components": [
    {
      title: "Industrial Wear Lining",
      description: "Wear lining and pulley lagging for conveyor and transfer-point service.",
      href: "/industrial-wear-lining",
    },
  ],
};

function draftBlocksFor(slug: string, markdown: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [{ type: "richText", markdown }];
  const faqs = SERVICE_FAQS[slug];
  if (faqs && faqs.length > 0) {
    blocks.push({ type: "faq", heading: "Frequently Asked Questions", items: faqs });
  }
  const related = RELATED_SOLUTIONS[slug];
  if (related && related.length > 0) {
    blocks.push({ type: "relatedSolutions", heading: "Related Solutions", items: related });
  }
  blocks.push({ type: "caseStudyStrip", heading: "Projects", serviceSlug: null, limit: 3 });
  return blocks;
}

export const up = async (db: mongo.Db): Promise<void> => {
  const now = new Date().toISOString();
  let updated = 0;
  for (const slug of Object.keys(SERVICE_FAQS)) {
    const page = await db.collection(COLLECTION).findOne({ slug });
    if (!page) {
      continue;
    }
    const markdown = typeof page.content === "string" ? page.content : "";
    await db
      .collection(COLLECTION)
      .updateOne(
        { _id: page._id },
        { $set: { draftBlocks: draftBlocksFor(slug, markdown), draftUpdatedAt: now } },
      );
    updated += 1;
  }
  console.warn(`[migration] Authored draft blocks for ${updated} AU service page(s).`);
};

export const down = async (db: mongo.Db): Promise<void> => {
  const now = new Date().toISOString();
  for (const slug of Object.keys(SERVICE_FAQS)) {
    const page = await db.collection(COLLECTION).findOne({ slug });
    if (!page) {
      continue;
    }
    const markdown = typeof page.content === "string" ? page.content : "";
    await db
      .collection(COLLECTION)
      .updateOne(
        { _id: page._id },
        { $set: { draftBlocks: [{ type: "richText", markdown }], draftUpdatedAt: now } },
      );
  }
};
