export type CaseStudyType = "project" | "showcase";

export interface CaseStudyPhoto {
  src: string;
  alt: string;
}

export interface CaseStudy {
  slug: string;
  type: CaseStudyType;
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  problem: string | null;
  solution: string | null;
  materials: string[];
  industry: string | null;
  location: string | null;
  country: string | null;
  dateLabel: string;
  dateISO: string;
  services: string[];
  photos: CaseStudyPhoto[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "au40-black-fittings-namibia-mine",
    type: "project",
    title: "AU 40 Black Lined Fittings — Namibia Mine",
    metaTitle: "AU 40 Black Rubber Lined Fittings for Namibian Mine",
    metaDescription:
      "Pipe fittings rubber lined with AU 40 Black natural rubber for a mining customer in Namibia. Abrasion-resistant lining for high-wear slurry service.",
    summary:
      "AU Industries supplied a batch of flanged pipe fittings rubber lined with AU 40 Black natural rubber for a mining operation in Namibia. The 40-shore black natural rubber lining is the workhorse compound for abrasive slurry service across Southern African mines.",
    problem:
      "Unlined steel fittings in slurry service erode rapidly under abrasive flow, driving high replacement costs and unplanned downtime. The customer required a corrosion- and wear-resistant lining suited to general mineral processing slurries.",
    solution:
      "We rubber lined the fittings with 6mm AU 40 Black, our 40-shore natural rubber compound formulated for abrasion resistance. Each fitting was prepped, primed, and autoclave-cured to ensure long-term adhesion before being inspected, packed, and dispatched to site.",
    materials: ["AU 40 Black natural rubber"],
    industry: "Mining",
    location: "Namibia",
    country: "Namibia",
    dateLabel: "July 2025",
    dateISO: "2025-07-15",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "gallery52.jpg", alt: "AU 40 Black rubber lined flanged fitting for Namibian mine" },
      { src: "gallery53.jpg", alt: "Interior view of AU 40 Black rubber lined pipe fitting" },
      {
        src: "gallery54.jpg",
        alt: "Completed AU 40 Black lined fittings ready for dispatch to Namibia",
      },
    ],
  },
  {
    slug: "au-60-shore-fittings-mozambique-mine",
    type: "project",
    title: "AU Premium 60 Shore Lined Fittings — Mozambique Mine",
    metaTitle: "AU Premium 60 Shore Rubber Lined Fittings for Mozambique Mine",
    metaDescription:
      "Pipe fittings lined with AU premium 60 Shore rubber compound for a mining customer in Mozambique. Higher-hardness lining for impact-loaded slurry duty.",
    summary:
      "We delivered rubber lined fittings finished in AU's premium 60-shore compound for a Mozambican mine. The harder 60-shore lining trades a small amount of resilience for improved cut and tear resistance in coarser slurry streams.",
    problem:
      "Standard 40-shore liners can deform under heavy impact from coarse particles. The customer's process carries a high proportion of larger particle sizes, requiring a harder rubber that resists chunking and cutting damage.",
    solution:
      "Fittings were lined with AU's premium 60-shore natural rubber compound — a higher-modulus lining bonded with autoclave cure to give a denser surface against coarse-slurry impact. Each piece was inspected, certified, and crated for export.",
    materials: ["AU premium 60 Shore natural rubber"],
    industry: "Mining",
    location: "Mozambique",
    country: "Mozambique",
    dateLabel: "July 2025",
    dateISO: "2025-07-10",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "gallery50.jpg", alt: "AU premium 60 Shore rubber lined fitting for Mozambique mine" },
      { src: "gallery51.jpg", alt: "Finished 60 Shore rubber lined pipe fittings" },
    ],
  },
  {
    slug: "ceramic-rubber-hoses-mozambique-mine",
    type: "project",
    title: "Ceramic Embedded Rubber Hoses — Mozambique Mine",
    metaTitle: "Ceramic Embedded Rubber Hoses for Mozambique Mining Operation",
    metaDescription:
      "Custom ceramic embedded rubber hoses fabricated for a mining customer in Mozambique. Tile-armoured rubber for severe-wear slurry transfer.",
    summary:
      "AU Industries fabricated a set of ceramic embedded rubber hoses for a mining operation in Mozambique. Embedding alumina ceramic tiles into a flexible rubber matrix combines the impact tolerance of rubber with the abrasion resistance of ceramic — ideal for the most aggressive slurry duties.",
    problem:
      "Rubber-only hoses wear out quickly in high-velocity coarse slurry, while pure ceramic linings shatter under impact and shock loading. The customer needed a flexible transfer hose that could survive both abrasion and impact.",
    solution:
      "We bonded an array of high-alumina ceramic tiles into a 40-shore rubber backing to form the inside surface of the hose, with a flexible rubber outer cover. The tile pattern absorbs impact through the rubber matrix while the ceramic face takes the abrasion.",
    materials: ["AU 40 Black natural rubber", "High-alumina ceramic tiles"],
    industry: "Mining",
    location: "Mozambique",
    country: "Mozambique",
    dateLabel: "July 2025",
    dateISO: "2025-07-05",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "gallery47.jpg", alt: "Ceramic embedded rubber hose section showing embedded tiles" },
      { src: "gallery48.jpg", alt: "Ceramic rubber hose assembly for Mozambique mining operation" },
      { src: "gallery49.jpg", alt: "Completed ceramic embedded rubber hoses ready for shipping" },
    ],
  },
  {
    slug: "au40-red-pipes-limpopo-mine",
    type: "project",
    title: "12mm AU 40 Red Lined Pipes — Limpopo Mine",
    metaTitle: "AU 40 Red Rubber Lined Pipes for Limpopo Mining Project",
    metaDescription:
      "Steel pipes lined with 12mm AU 40 Red natural rubber for a Limpopo mining customer. Heavy-duty lining for long-life slurry service.",
    summary:
      "We rubber lined a set of steel pipes with a thick 12mm layer of AU 40 Red natural rubber for a mining customer in Limpopo. The increased thickness extends service life on routes where the customer wants to minimise the maintenance interval.",
    problem:
      "Standard 6mm rubber liners deliver a sensible balance of cost and life, but on the customer's heavy-wear lines that meant frequent re-lining. They asked for a thicker liner specification to push out the service interval.",
    solution:
      "Each pipe was lined with 12mm AU 40 Red natural rubber, bonded and autoclave-cured. The doubled wall thickness gives proportionally more wear life, while the red colour aids visual inspection of liner condition versus the steel substrate.",
    materials: ["AU 40 Red natural rubber (12mm)"],
    industry: "Mining",
    location: "Limpopo, South Africa",
    country: "South Africa",
    dateLabel: "July 2025",
    dateISO: "2025-07-01",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "gallery44.jpg", alt: "12mm AU 40 Red rubber lined pipe interior view" },
      { src: "gallery45.jpg", alt: "Red rubber lined steel pipe for Limpopo mine project" },
      { src: "gallery46.jpg", alt: "Batch of AU 40 Red lined pipes ready for delivery to Limpopo" },
    ],
  },
  {
    slug: "au40-black-pipes-namibia-uranium",
    type: "project",
    title: "AU 40 Black Lined Pipes & Fittings — Namibia Uranium Mine",
    metaTitle: "AU 40 Black Rubber Lined Pipes for Namibian Uranium Mine",
    metaDescription:
      "Rubber lined pipes and fittings supplied to a uranium mining operation in Namibia. AU 40 Black natural rubber lining for radioactive ore slurry service.",
    summary:
      "AU Industries supplied a complete set of rubber lined pipes and fittings for a uranium mining operation in Namibia. The lining package was specified for a leach-circuit slurry line carrying uranium-bearing ore.",
    problem:
      "Uranium ore slurries combine fine abrasive particulates with corrosive process chemistry, and unlined carbon steel will not last in the leach circuit. The customer needed a chemically resistant abrasion liner with a known service history.",
    solution:
      "We lined the pipes and fittings with AU 40 Black natural rubber, our standard abrasion-resistant compound. Lining thickness, end laps, and flange faces were specified to suit autoclave processing and bolted assembly on site.",
    materials: ["AU 40 Black natural rubber"],
    industry: "Uranium mining",
    location: "Namibia",
    country: "Namibia",
    dateLabel: "June 2025",
    dateISO: "2025-06-20",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "gallery41.jpg", alt: "AU 40 Black lined pipe for uranium mine in Namibia" },
      { src: "gallery42.jpg", alt: "Rubber lined fitting showing black natural rubber interior" },
      {
        src: "gallery43.jpg",
        alt: "Completed lined pipes and fittings for Namibian uranium project",
      },
    ],
  },
  {
    slug: "custom-compound-pipes-west-africa",
    type: "project",
    title: "Custom AU Compound Lined Pipes — West Africa",
    metaTitle: "Custom Rubber Compound Lined Pipes for West Africa Mining",
    metaDescription:
      "Steel pipes lined with a bespoke AU rubber compound developed for a customer's specific process in West Africa. Custom formulation for unusual slurry chemistry.",
    summary:
      "AU Industries developed and supplied a bespoke rubber compound for a customer's process in West Africa, then lined a set of pipes with that compound. Custom compounding lets us match unusual chemistry, temperature, or wear profiles that off-the-shelf liners cannot.",
    problem:
      "The customer's process exposed standard rubber linings to a combination of conditions that no catalogue compound could handle. They needed a tailored formulation that would survive their specific chemistry and operating profile.",
    solution:
      "Working with our compounding partner, we developed a custom natural-rubber-based formulation tuned to the customer's process. Trial samples were tested before scaling up to production lining of the full pipe set.",
    materials: ["Custom AU natural rubber compound"],
    industry: "Mining",
    location: "West Africa",
    country: "West Africa",
    dateLabel: "June 2025",
    dateISO: "2025-06-15",
    services: ["rubber-lining", "rubber-compound", "mining-solutions"],
    photos: [
      { src: "gallery38.jpg", alt: "Custom compound rubber lined pipe for West Africa project" },
      { src: "gallery39.jpg", alt: "AU custom rubber compound lining applied to steel pipe" },
      { src: "gallery40.jpg", alt: "Lined pipes with bespoke AU compound for West African mine" },
    ],
  },
  {
    slug: "hdpe-piping-mozambique",
    type: "project",
    title: "HDPE Piping — Mozambique Customer",
    metaTitle: "HDPE Pipe Project for Mozambique Industrial Customer",
    metaDescription:
      "HDPE pipe sections fabricated and supplied for a customer in Mozambique. Chemical-resistant, lightweight piping for industrial water and process duty.",
    summary:
      "AU Industries fabricated and supplied a set of HDPE pipes and fittings for a customer in Mozambique. HDPE is the modern alternative to rubber lined steel for water, mild-chemical, and tailings duties — corrosion-proof, lightweight, and butt-fusion welded into long continuous runs.",
    problem:
      "The customer's existing rubber lined or coated steel pipework was suffering external and flange-face corrosion in a wet operating environment. They wanted to switch to a piping material that would not corrode at all.",
    solution:
      "We supplied HDPE pipe sections cut to length with butt-fusion or electrofusion joints, complete with HDPE fittings. The result is a fully welded, corrosion-free pipeline with a 50-year design life under normal water duty.",
    materials: ["HDPE PE100"],
    industry: "Industrial",
    location: "Mozambique",
    country: "Mozambique",
    dateLabel: "June 2025",
    dateISO: "2025-06-10",
    services: ["hdpe-piping", "mining-solutions"],
    photos: [
      { src: "gallery35.jpg", alt: "HDPE pipe sections fabricated for Mozambique project" },
      { src: "gallery36.jpg", alt: "HDPE piping installation components for mining operation" },
      { src: "gallery37.jpg", alt: "Completed HDPE pipe delivery for Mozambique customer" },
    ],
  },
  {
    slug: "au-rubber-rolls-delivery",
    type: "showcase",
    title: "AU Rubber Sheeting Rolls — Customer Delivery",
    metaTitle: "AU Rubber Sheeting Rolls Ready for Customer Delivery",
    metaDescription:
      "AU Industries rubber sheeting rolls being prepared and dispatched to customers across Southern Africa.",
    summary:
      "A snapshot of AU rubber sheeting rolls being prepared in our Boksburg warehouse and loaded for customer delivery. We hold stock of black 40-shore, red 40-shore, and pink A38 sheeting in standard widths for fast turnaround.",
    problem: null,
    solution: null,
    materials: ["AU rubber sheeting (multiple compounds)"],
    industry: null,
    location: "Boksburg, South Africa",
    country: "South Africa",
    dateLabel: "June 2025",
    dateISO: "2025-06-01",
    services: ["rubber-sheeting", "rubber-rolls"],
    photos: [
      { src: "gallery32.jpg", alt: "Rolls of AU natural rubber sheeting on delivery truck" },
      { src: "gallery33.jpg", alt: "Stacked rubber sheeting rolls in AU Industries warehouse" },
      { src: "gallery34.jpg", alt: "AU rubber rolls prepared for customer delivery" },
    ],
  },
  {
    slug: "au-a38-pink-rubber-rolls-manufacturing",
    type: "showcase",
    title: "AU A38 Pink Rubber Rolls — Manufacturing",
    metaTitle: "AU A38 Pink Premium Rubber Rolls Being Manufactured",
    metaDescription:
      "AU Industries A38 premium pink rubber sheeting being calendered and rolled at our manufacturing partner.",
    summary:
      "A look inside the manufacturing run for AU's A38 premium pink rubber sheeting. The compound is calendered to thickness, then rolled into the finished sheeting rolls we stock and supply.",
    problem: null,
    solution: null,
    materials: ["AU A38 premium pink rubber"],
    industry: null,
    location: "South Africa",
    country: "South Africa",
    dateLabel: "May 2025",
    dateISO: "2025-05-25",
    services: ["rubber-sheeting", "rubber-rolls"],
    photos: [
      { src: "gallery29.jpg", alt: "AU A38 Pink rubber sheeting on manufacturing calender" },
      { src: "gallery30.jpg", alt: "Pink rubber compound being processed through rolling mill" },
      { src: "gallery31.jpg", alt: "Finished AU A38 Pink rubber rolls after manufacturing" },
    ],
  },
  {
    slug: "au-a38-pink-compound",
    type: "showcase",
    title: "AU A38 Pink Premium Rubber Compound",
    metaTitle: "AU A38 Pink Premium Rubber Compound",
    metaDescription:
      "AU's A38 premium pink rubber compound — formulated in-house for high-performance sheeting and lining applications.",
    summary:
      "AU's A38 premium pink rubber compound is one of our flagship formulations — a higher-grade natural rubber blend for demanding wear and chemical environments. Pink colouring also acts as a wear indicator under operation.",
    problem: null,
    solution: null,
    materials: ["AU A38 premium pink rubber compound"],
    industry: null,
    location: "South Africa",
    country: "South Africa",
    dateLabel: "May 2025",
    dateISO: "2025-05-20",
    services: ["rubber-compound", "rubber-sheeting"],
    photos: [
      { src: "gallery26.jpg", alt: "AU premium A38 pink rubber compound block" },
      { src: "gallery27.jpg", alt: "A38 pink rubber compound showing colour and texture" },
      { src: "gallery28.jpg", alt: "Batch of AU A38 premium pink rubber compound" },
    ],
  },
  {
    slug: "ceramic-embedded-rubber-wear-panels",
    type: "showcase",
    title: "Ceramic Embedded Rubber Wear Panels",
    metaTitle: "Ceramic Embedded Rubber Wear Panels for Chute Lining",
    metaDescription:
      "AU Industries ceramic embedded rubber wear panels — alumina ceramic tiles bonded into a rubber matrix for chute, hopper, and transfer-point lining.",
    summary:
      "Ceramic embedded rubber wear panels for chute and transfer-point lining. The alumina ceramic tile face delivers extreme abrasion resistance while the rubber matrix absorbs impact and damps vibration.",
    problem: null,
    solution: null,
    materials: ["AU 40 Black natural rubber", "High-alumina ceramic tiles"],
    industry: null,
    location: "South Africa",
    country: "South Africa",
    dateLabel: "May 2025",
    dateISO: "2025-05-10",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "gallery22.jpg", alt: "Ceramic embedded rubber wear panel showing tile pattern" },
      { src: "gallery23.jpg", alt: "Close-up of ceramic tiles bonded into rubber wear panel" },
      { src: "gallery25.jpg", alt: "Set of ceramic embedded rubber panels for chute lining" },
    ],
  },
  {
    slug: "au-40-black-compound",
    type: "showcase",
    title: "AU 40 Shore Black Natural Rubber Compound",
    metaTitle: "AU 40 Shore Black Natural Rubber Compound",
    metaDescription:
      "AU 40 shore black natural rubber compound — our workhorse abrasion-resistant lining and sheeting compound.",
    summary:
      "AU 40 shore black natural rubber is our most widely supplied compound — a classic 40-durometer natural rubber tuned for abrasion resistance in mining slurry duty. Used across our lining, sheeting, and fabricated rubber product lines.",
    problem: null,
    solution: null,
    materials: ["AU 40 Black natural rubber"],
    industry: null,
    location: "South Africa",
    country: "South Africa",
    dateLabel: "April 2025",
    dateISO: "2025-04-20",
    services: ["rubber-compound", "rubber-lining", "rubber-sheeting"],
    photos: [
      { src: "gallery12.jpg", alt: "AU 40 shore black natural rubber compound sample" },
      { src: "gallery13.jpg", alt: "Black rubber compound block showing consistency" },
      { src: "gallery15.jpg", alt: "AU 40 shore black compound prepared for sheeting production" },
    ],
  },
  {
    slug: "au-40-black-rubber-sheeting-manufacturing",
    type: "showcase",
    title: "AU 40 Shore Black Rubber Sheeting — Manufacturing",
    metaTitle: "AU 40 Shore Black Rubber Sheet Manufacturing",
    metaDescription:
      "AU 40 shore black rubber sheeting being calendered and rolled during a manufacturing run.",
    summary:
      "Behind-the-scenes look at AU 40 shore black rubber sheeting on the production calender. The compound is rolled to gauge, cooled, and wound into finished rolls before being trimmed to customer-specified widths.",
    problem: null,
    solution: null,
    materials: ["AU 40 Black natural rubber"],
    industry: null,
    location: "South Africa",
    country: "South Africa",
    dateLabel: "April 2025",
    dateISO: "2025-04-15",
    services: ["rubber-sheeting", "rubber-rolls"],
    photos: [
      { src: "gallery14.jpg", alt: "Black rubber sheeting on calender during manufacturing" },
      { src: "gallery16.jpg", alt: "40 shore black rubber sheet being rolled after calendering" },
      { src: "gallery17.jpg", alt: "Finished AU 40 shore black rubber sheet rolls" },
    ],
  },
  {
    slug: "au40-red-pipes-mpumalanga-platinum",
    type: "project",
    title: "AU 40 Red Lined Pipes — Mpumalanga Platinum Mine",
    metaTitle: "AU 40 Red Rubber Lined Pipes for Mpumalanga Platinum Mine",
    metaDescription:
      "Steel pipes lined with AU 40 Red natural rubber for a platinum mine in Mpumalanga, South Africa. Heavy-duty lining for PGM concentrator slurry service.",
    summary:
      "AU Industries lined a set of steel pipes with AU 40 Red natural rubber for a platinum mine in Mpumalanga. The red colourant gives an obvious visual contrast against the steel substrate, making liner inspection straightforward without strip-down.",
    problem:
      "PGM (platinum group metal) concentrator circuits run abrasive slurries through long pipe runs, and unlined steel doesn't last. The customer needed a proven abrasion liner with a track record on platinum slurry chemistry.",
    solution:
      "Pipes were rubber lined with AU 40 Red natural rubber — same base compound as our standard black, but with a red wear-indicator colourant. Each pipe was prepped, primed, lined, and autoclave-cured before flange-faces were trimmed and the assemblies were dispatched to site.",
    materials: ["AU 40 Red natural rubber"],
    industry: "Platinum mining",
    location: "Mpumalanga, South Africa",
    country: "South Africa",
    dateLabel: "October 2024",
    dateISO: "2024-10-15",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "gallery02.jpg", alt: "AU Red 40 shore rubber lined pipe for platinum mine" },
      { src: "gallery04.jpg", alt: "Interior red rubber lining of steel pipe for Mpumalanga mine" },
      { src: "gallery20.jpg", alt: "Completed red rubber lined pipes for platinum mine delivery" },
    ],
  },
  {
    slug: "au-red-fittings-mozambique-titanium-sep-2024",
    type: "project",
    title: "AU Red Lined Fittings — Mozambique Titanium Mine (Sept 2024)",
    metaTitle: "AU Red Rubber Lined Fittings for Mozambique Titanium Mine",
    metaDescription:
      "Pipe fittings lined with AU Red natural rubber for a titanium mining customer in Mozambique. September 2024 delivery.",
    summary:
      "We supplied a set of red rubber lined fittings for a titanium mining operation in Mozambique. Titanium-bearing slurries are highly abrasive on standard steel pipework — the rubber lining package was specified to extend service life on the affected lines.",
    problem:
      "Titanium ore concentrator slurries are aggressive on unlined steel fittings, and the customer was replacing them more often than their maintenance budget allowed. They wanted a longer-life rubber lined alternative for the elbows, tees, and reducers in the circuit.",
    solution:
      "We rubber lined the elbows, tees, and reducers with AU Red 40-shore natural rubber, autoclave-cured to ensure long-term liner adhesion. The red colour aids inspection of liner condition during planned maintenance.",
    materials: ["AU 40 Red natural rubber"],
    industry: "Titanium mining",
    location: "Mozambique",
    country: "Mozambique",
    dateLabel: "September 2024",
    dateISO: "2024-09-15",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "projectgallery17.jpg", alt: "Red rubber lined elbow fitting for titanium mine" },
      {
        src: "projectgallery18.jpg",
        alt: "Rubber lined tee fitting for Mozambique titanium project",
      },
      {
        src: "projectgallery19.jpg",
        alt: "Set of red lined fittings ready for Mozambique shipment",
      },
    ],
  },
  {
    slug: "au-red-fittings-mozambique-titanium-jul-2024",
    type: "project",
    title: "AU Red Lined Fittings — Mozambique Titanium Mine (July 2024)",
    metaTitle: "AU Red Rubber Lined Fittings for Mozambique Titanium Project",
    metaDescription:
      "Rubber lined reducers and large-diameter fittings for a Mozambique titanium mining customer. July 2024 delivery.",
    summary:
      "An earlier batch of AU Red rubber lined fittings supplied to the same Mozambique titanium operation, including a large-diameter fitting and a set of reducers. Lining package and curing process matched the customer's existing standard for the circuit.",
    problem:
      "Wear on the larger-diameter fittings and reducers in the customer's slurry circuit was driving frequent replacements. They wanted matched-spec rubber lined replacements to standardise the maintenance interval across the line.",
    solution:
      "Reducers and the large-diameter fitting were lined with AU Red 40-shore natural rubber, matched to the customer's existing lining specification. Each piece was prepped, primed, lined, and autoclave-cured before dispatch.",
    materials: ["AU 40 Red natural rubber"],
    industry: "Titanium mining",
    location: "Mozambique",
    country: "Mozambique",
    dateLabel: "July 2024",
    dateISO: "2024-07-15",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      { src: "gallery19.jpg", alt: "Red rubber lined reducer for titanium mine piping system" },
      {
        src: "projectgallery13.jpg",
        alt: "Large diameter rubber lined fitting for Mozambique mine",
      },
      {
        src: "projectgallery14.jpg",
        alt: "Completed rubber lined fittings batch for titanium project",
      },
    ],
  },
  {
    slug: "rubber-lined-pipes-chutes-mozambique-titanium",
    type: "project",
    title: "Rubber Lined Pipes & Chutes — Mozambique Titanium Mine",
    metaTitle: "Rubber Lined Pipes & Chutes for Mozambique Titanium Mine",
    metaDescription:
      "Rubber lined pipes and fabricated chutes supplied to a titanium mining operation in Mozambique. Combined lining and chute fabrication scope.",
    summary:
      "AU Industries fabricated rubber lined pipes and chutes for a titanium mining operation in Mozambique. The scope combined our pipe lining and chute fabrication offerings into a single package delivered to site.",
    problem:
      "The customer needed both pipework and chute work for a single circuit upgrade, and wanted a single supplier accountable for the lining specification across both. Coordinating two suppliers risked mismatched compounds and adhesion standards.",
    solution:
      "We fabricated and rubber lined the chutes alongside lining the supporting pipework, all in the same compound and curing standard. This matched the wear life across the whole circuit and gave the customer one quality dossier to file.",
    materials: ["AU 40 natural rubber lining", "Fabricated steel chutes"],
    industry: "Titanium mining",
    location: "Mozambique",
    country: "Mozambique",
    dateLabel: "June 2022",
    dateISO: "2022-06-15",
    services: ["rubber-lining", "mining-solutions"],
    photos: [
      {
        src: "projectgallery01.jpg",
        alt: "Rubber lined chute fabrication for Mozambique titanium mine",
      },
      {
        src: "projectgallery05.jpg",
        alt: "Large rubber lined pipe section for mineral processing",
      },
      {
        src: "projectgallery10.jpg",
        alt: "Completed rubber lined pipes and chutes for titanium mine",
      },
    ],
  },
  {
    slug: "rubber-lined-hdpe-pipes-limpopo-copper",
    type: "project",
    title: "Rubber Lined & HDPE Pipes — Limpopo Copper Mine",
    metaTitle: "Rubber Lined and HDPE Pipes for Limpopo Copper Mine",
    metaDescription:
      "Combined rubber lined steel and HDPE pipework supplied to a copper mining customer in Limpopo. Mixed-material circuit for slurry and water duties.",
    summary:
      "A combined supply of rubber lined steel pipes and HDPE pipes for a copper mining customer in Limpopo. Mixing the two pipe types in one circuit lets the customer use rubber lined steel where impact and temperature demand it, and HDPE where corrosion and cost-per-metre dominate.",
    problem:
      "The customer's pipework spec called for two materials across the circuit — rubber lined steel for the slurry duties, HDPE for the water and tailings duties. They wanted a single supplier covering both rather than buying split-scope.",
    solution:
      "We supplied the rubber lined steel sections and the HDPE sections as a coordinated package, with matched flange or coupling interfaces between them. Both scopes were inspected and certified together before dispatch.",
    materials: ["AU 40 natural rubber lining", "HDPE PE100"],
    industry: "Copper mining",
    location: "Limpopo, South Africa",
    country: "South Africa",
    dateLabel: "September 2021",
    dateISO: "2021-09-15",
    services: ["rubber-lining", "hdpe-piping", "mining-solutions"],
    photos: [
      { src: "gallery05.jpg", alt: "Rubber lined steel pipe for Limpopo copper mine" },
      { src: "gallery08.jpg", alt: "HDPE pipe sections prepared for copper mine installation" },
      {
        src: "projectgallery23.jpg",
        alt: "Combined rubber lined and HDPE pipe delivery for copper mine",
      },
    ],
  },
];

export const CASE_STUDY_BY_SLUG: Record<string, CaseStudy> = CASE_STUDIES.reduce(
  (acc, study) => ({ ...acc, [study.slug]: study }),
  {} as Record<string, CaseStudy>,
);

export function caseStudiesForService(serviceSlug: string): CaseStudy[] {
  return CASE_STUDIES.filter((study) => study.services.includes(serviceSlug));
}

export function projectCaseStudies(): CaseStudy[] {
  return CASE_STUDIES.filter((study) => study.type === "project");
}
