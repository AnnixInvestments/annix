#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import dns from "node:dns";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = [
  resolve(scriptDir, "../annix-backend/.env"),
  "C:/Users/andy/Documents/Annix-sync/annix-backend/.env",
].find((p) => existsSync(p));
if (!envPath) {
  console.error("could not locate annix-backend/.env");
  process.exit(1);
}
const env = readFileSync(envPath, "utf8");
const read = (k) => {
  const l = env.split(/\r?\n/).find((x) => x.startsWith(`${k}=`));
  return l
    ? l
        .slice(k.length + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    : null;
};
const uri = read("MONGODB_URI");
const dbName = read("MONGO_DATABASE");
if (!uri || !dbName) {
  console.error("MONGODB_URI / MONGO_DATABASE missing");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const AUTHOR = "AU Industries";

const POSTS = [
  {
    slug: "rubber-vs-ceramic-vs-hdpe-lining-mining",
    title: "Rubber vs Ceramic vs HDPE Lining: Choosing the Right Wear Material for Mining",
    metaTitle: "Rubber vs Ceramic vs HDPE Lining for Mining | AU Industries",
    metaDescription:
      "How to choose between rubber lining, ceramic embedded rubber and HDPE for mining wear — by abrasion, impact and corrosion. A practical guide from AU Industries, Boksburg.",
    excerpt:
      "Rubber, ceramic embedded rubber and HDPE each beat the others in a different duty. Here's how to match the lining to your wear mechanism instead of paying for the wrong one.",
    heroImageUrl: "/au-industries/gallery/gallery41.jpg",
    content: `The wrong lining doesn't fail because the material is bad — it fails because it was chosen for the wrong wear mechanism. Before you compare quotes, work out what is actually destroying your equipment: fine sliding abrasion, coarse high-impact particles, or corrosion. That answer usually picks the material for you.

## How each material actually fails

- **Sliding (fine) abrasion** — fine, fast particles polishing a surface. Resilient materials win because they flex and let particles glance off.
- **Impact / gouging** — coarse, heavy particles dropping or tumbling. Harder, tougher surfaces win because they resist cutting and chunking.
- **Corrosion / chemical attack** — acids, brine and process water eating steel. Here the lining's job is a chemical barrier, not abrasion resistance.

Most real duties are a mix, which is why the best answer is often a combination.

## Rubber lining — the workhorse for slurry abrasion

Natural [rubber lining](/rubber-lining) is the default for fine, high-velocity slurry — cyclone feeds, mill discharge, pump casings and slurry pipework. Its resilience lets fine particles bounce off rather than cut, and it bonds to grit-blasted steel for a long, leak-free service life. AU 40 Shore is the standard slurry compound; for coarser, higher-impact streams a 60 Shore or our premium [A38 compound](/rubber-compound) trades a little flexibility for cut and tear resistance.

Rubber also has a chemical-resistant side: Bromobutyl for acid and CIL/CIP duty, Nitrile for oils and hydrocarbons.

## Ceramic embedded rubber — for severe sliding wear

Where plain rubber wears too fast — aggressive transfer points, chute walls, hopper liners — [ceramic embedded rubber](/conveyor-components) panels combine the impact tolerance of rubber with the abrasion resistance of alumina ceramic tiles. The tiles take the sliding abrasion while the rubber matrix absorbs impact, so the panel outlasts plain rubber on the most punishing duties. It costs more per square metre, so it pays where rubber's replacement interval is short enough to hurt production.

## HDPE — corrosion resistance and flow, not impact

[HDPE piping](/hdpe-piping) is the right call when corrosion and a long, leak-free buried life matter more than impact resistance: tailings lines, process water, dewatering and slurry transport. It will not rust or corrode, its butt-welded joints are as strong as the pipe wall, and it has good inherent abrasion resistance for many slurries. For the most aggressive slurries we supply rubber-lined steel and ceramic-lined steel as alternatives where HDPE alone would wear at the invert.

## A quick decision guide

- **Fine slurry, pipes and pumps** → rubber lining (40 Shore).
- **Coarse, high-impact chutes and hoppers** → 60 Shore rubber, or ceramic embedded rubber at the worst points.
- **Acid / chemical service** → Bromobutyl rubber lining.
- **Buried water, tailings, dewatering** → HDPE.
- **Mixed duty** → combine: HDPE or steel pipework with rubber or ceramic lining at the wear-critical sections.

## Not sure which way to go?

Send us your process conditions — particle size, slurry concentration, pH and flow rate — and we will recommend the material, compound and thickness, and quote it from our [Boksburg facility](/mining-solutions). The cheapest lining is the one you do not have to replace next shutdown.

[Request a quote](/quote) or [contact us](/contact).`,
  },
  {
    slug: "rubber-hardness-40-vs-60-shore-explained",
    title: "Rubber Hardness Explained: 40 vs 60 Shore vs Custom Compounds for Mining",
    metaTitle: "40 vs 60 Shore Rubber Hardness Explained | AU Industries",
    metaDescription:
      "What Shore hardness means for rubber lining life, and when to choose 40 Shore, 60 Shore or a custom AU compound for slurry, impact and chemical duty. Boksburg-based AU Industries.",
    excerpt:
      "Shore hardness is the single biggest factor in how long a lining lasts. Here's what 40, 60 and custom compounds are actually for — and how to pick the right one.",
    heroImageUrl: "/au-industries/gallery/gallery12.jpg",
    content: `Get the compound hardness right and a rubber lining lasts for years. Get it wrong and you are back in a shutdown re-lining the same chute. Shore hardness is the simplest lever you have, so it is worth understanding before you specify.

## What Shore hardness actually measures

Shore A hardness describes how much the rubber resists indentation — how soft or hard it feels. Softer rubber is more resilient and flexible; harder rubber is more rigid and resists cutting. Neither is "better"; they suit different wear mechanisms. The trick is matching hardness to the way your process attacks the lining.

## 40 Shore — fine, high-velocity slurry

Our [AU 40 Black and AU 40 Red](/rubber-compound) natural rubber is the workhorse for fine abrasive slurry: slurry pipelines, cyclone feeds, pump casings and mill discharge. At 40 Shore the rubber is soft enough to flex under fine particle impact, letting particles glance off rather than cut into the surface. That resilience is exactly why low-hardness rubber outlasts harder materials in fine slurry — the property that feels like a weakness is the one doing the work.

## 60 Shore — coarse particles and impact

When the stream carries larger particles or drops from height — chutes, hoppers, screen feed, transfer points — a softer rubber can deform and chunk under the impact. AU 60 Shore is harder and denser, so it resists cutting and gouging from coarse material. You trade a little resilience for cut and tear resistance, which is the right trade when impact, not fine abrasion, is the enemy.

## A38 premium — maximum wear life

Our [A38 compound](/rubber-compound) is our premium in-house formulation for the most aggressive abrasive conditions, where extended lining life is worth paying for. In comparative wear testing it outlasts standard 40 Shore compounds, which makes it the choice for critical assets where the cost of a re-line — and the downtime around it — is high.

## Custom compounds — when the catalogue does not fit

Sometimes the duty does not match a standard compound: very sharp particles, a specific chemical exposure, an unusual temperature range, or a need to match an existing lining. We develop [custom rubber compounds](/rubber-compound) against your conditions, considering particle size and shape, slurry concentration, chemical exposure, impact energy and operating temperature.

## A simple selection guide

- **Fine slurry, pipes, pumps, cyclones** → 40 Shore (Black or Red).
- **Coarse material, chutes, hoppers, impact zones** → 60 Shore.
- **Critical assets, longest possible life** → A38 premium.
- **Acid / chemical service** → Bromobutyl (chemical resistance trumps hardness here).
- **Oil / fuel contact** → Nitrile.

## Specify with confidence

The same compounds are available as bonded [rubber lining](/rubber-lining), [rubber sheeting](/rubber-sheeting) and [rubber rolls](/rubber-rolls), so you can standardise across the plant. Send us your process conditions and we will recommend the hardness and thickness and quote it from Boksburg.

[Request a quote](/quote) or [contact us](/contact).`,
  },
  {
    slug: "hdpe-piping-for-mine-slurry",
    title: "HDPE Piping for Mine Slurry: Durability, Cost and Lead Times",
    metaTitle: "HDPE Piping for Mine Slurry — Durability & Cost | AU Industries",
    metaDescription:
      "Why HDPE is used for mine slurry and tailings, how to choose PE80 vs PE100 and pressure class, jointing, abrasion life and lead times. HDPE supply and fabrication from AU Industries.",
    excerpt:
      "HDPE has quietly replaced steel on a lot of mine water and slurry lines. Here's why, how to spec it, and where it still needs help on the most abrasive duties.",
    heroImageUrl: "/au-industries/gallery/gallery35.jpg",
    content: `On a lot of mine sites, HDPE has quietly taken over the lines that used to be steel — tailings, process water, dewatering and slurry transport. The reasons are practical: it does not corrode, it joins leak-free, and it handles ground movement. Here is how to spec it properly.

## Why HDPE for slurry and water

- **Corrosion-proof** — it will not rust, rot or corrode, so wall thickness is not eaten away from the outside or inside by chemistry.
- **Leak-free joints** — butt-fused joints are as strong as the pipe wall, with no leak path, which matters on long buried runs.
- **Flexible** — it accommodates ground movement and thermal expansion that would crack rigid pipe.
- **Long life** — a 50-year-plus design life under normal conditions, and it is lightweight, so handling and installation are faster than steel or concrete.

## PE80 vs PE100, and pressure class

Both are HDPE grades; PE100 has a higher minimum required strength, so for the same pressure rating it allows a thinner wall (more flow) or a higher pressure class at the same wall. [We supply](/hdpe-piping) sizes from 20 mm to 1000 mm in pressure classes from PN6.3 to PN25, manufactured to recognised HDPE standards. We help you select the grade and class for your duty rather than over-speccing.

## Jointing — fusion, not couplings

HDPE is joined by fusion, which is why it is favoured for buried and high-pressure service:

- **Butt fusion** — pipe ends heated and pressed together to form a joint as strong as the pipe.
- **Electro-fusion** — fittings with an integral heating element, used for tie-ins and repairs where butt fusion is impractical.

We pre-fabricate spools, headers and branch configurations in our [Boksburg facility](/mining-solutions) so on-site work is reduced to a few field joints — faster installation and fewer chances for error.

## Abrasion: HDPE's quiet strength, and its limit

HDPE has genuinely good inherent abrasion resistance, which is a big part of why it works for slurry. On long abrasive lines you extend life further by specifying a heavier wall class and by periodically rotating the pipe so wear is spread around the bore instead of concentrating at the invert. Where the duty is too aggressive for HDPE alone, we also supply [rubber-lined](/rubber-lining) and ceramic-lined steel pipework as alternatives.

## Cost and lead times

HDPE often wins on installed cost against steel once you account for corrosion protection, lighter handling and faster jointing — and it avoids the recurring cost of cathodic protection and coating repairs. Lead times depend on size and pressure class; pre-fabricating spools to drawing usually shortens the on-site critical path. Talk to us early and we will scope supply plus fabrication together.

## Spec it with us

Tell us the line duty — fluid, pressure, size and route — and we will recommend grade, class and jointing, fabricate the spools, and quote supply and fabrication from Boksburg.

[Request a quote](/quote) or [contact us](/contact).`,
  },
  {
    slug: "on-site-rubber-lining-gauteng",
    title: "On-Site Rubber Lining in Gauteng and the East Rand",
    metaTitle: "On-Site Rubber Lining in Gauteng & East Rand | AU Industries",
    metaDescription:
      "On-site rubber lining, shutdown support and pre-lined spools for mines and plants across Gauteng and the East Rand. AU Industries operates from Anderbolt, Boksburg.",
    excerpt:
      "What on-site rubber lining actually involves, how shutdown support works, and why a Boksburg base means short transit times for East Rand customers.",
    heroImageUrl: "/au-industries/gallery/projectgallery05.jpg",
    content: `Not every lining job can come to the shop. Tanks, large chutes and fixed equipment have to be lined where they stand — and the work has to fit inside a shutdown window. That is what on-site rubber lining is for, and getting it right is as much about logistics as it is about rubber.

## What on-site lining involves

Our field teams carry out bonded [rubber lining](/rubber-lining) on site for:

- **Pipe and spool lining** — slurry, process and tailings pipework.
- **Tank lining** — leach tanks, CIL/CIP tanks, acid tanks and storage vessels.
- **Chute lining** — transfer chutes, feed chutes and discharge points.
- **Pump lining** — casings, impellers and volutes.

Proper surface preparation is the part that makes or breaks adhesion, so teams grit-blast to a clean standard on site using mobile blasting equipment before any rubber goes on.

## Shutdown support — beating the window

The work you complete in a shutdown is limited by preparation, not just labour. We help customers get the most out of every window by:

- **Pre-lining components** — spools, bends and fittings are lined in [our Boksburg facility](/site-maintenance) and arrive ready to fit, so the critical-path work on site is fitting, not lining from scratch.
- **Surveying beforehand** — measuring and specifying wear items in advance so the right materials are on site.
- **Sequencing the work** — planning installation around the critical path so the longest tasks start first.
- **Carrying common spares** — standard liners, skirt rubber and impact bars kept in stock for fast turnaround.

## Why a Boksburg base matters

We operate from a fabrication facility in Anderbolt, Boksburg — the heart of the East Rand industrial belt. That location lets us collect, line and return work to nearby [Boksburg](/rubber-lining-boksburg), [Benoni](/rubber-lining-benoni), [Germiston](/rubber-lining-germiston), Brakpan and Springs customers on tight schedules, and serve the broader Witwatersrand mining and processing belt — and customers in [Witbank](/rubber-lining-witbank) and [Johannesburg](/rubber-lining-johannesburg) — with short transit times.

Short transit times are not just convenience: they mean less risk to your shutdown schedule and faster response when something wears through unexpectedly.

## Coverage beyond Gauteng

While the East Rand is our backyard, we mobilise teams across South Africa and into Mozambique, Namibia, Zambia, Botswana and Zimbabwe, and take on West African projects on request.

## Planning a shutdown?

Get us in early. We will survey the equipment, pre-line what we can in Boksburg, and bring a team to site to maximise the work completed in your window.

[Request a quote](/quote) or [contact us](/contact).`,
  },
  {
    slug: "ceramic-embedded-rubber-wear-panels",
    title: "Ceramic Embedded Rubber Wear Panels: Where They Pay Off",
    metaTitle: "Ceramic Embedded Rubber Wear Panels for Mining | AU Industries",
    metaDescription:
      "How ceramic embedded rubber wear panels work, why they outlast plain rubber at transfer points and chutes, and when the extra cost pays off. AU Industries, Boksburg.",
    excerpt:
      "Ceramic embedded rubber panels cost more than plain rubber — and outlast it many times over at the right spots. Here's how they work and where they earn their keep.",
    heroImageUrl: "/au-industries/gallery/gallery22.jpg",
    content: `At a punishing transfer point, plain rubber can wear through fast enough that you are replacing it every few months. That is exactly where ceramic embedded rubber earns its higher price — by lasting many times longer and taking the wear problem off your maintenance schedule.

## What they are

A ceramic embedded rubber wear panel is a flexible rubber matrix with alumina ceramic tiles moulded into it. It is a hybrid that gives you two properties at once:

- The **impact tolerance** of rubber — the matrix flexes and absorbs the shock of falling or tumbling material.
- The **abrasion resistance** of ceramic — the hard alumina tiles take the sliding wear that grinds plain rubber away.

Plain rubber alone wears too quickly under severe sliding abrasion; ceramic tile alone shatters under impact. Combining them solves both at once.

## Where they pay off

The economics are simple: ceramic embedded rubber costs more per square metre, so it pays where plain rubber's replacement interval is short enough to hurt. That usually means:

- **High-wear transfer points** — where material changes direction and slides against the wall at speed.
- **Chute and hopper walls** — sustained sliding abrasion from coarse, sharp material.
- **Discharge points and loading zones** — combined impact and abrasion.

If plain [rubber lining](/rubber-lining) is giving you good life in a spot, keep it — ceramic embedded rubber is for the locations that are eating rubber faster than you can fit it.

## Versus the alternatives

- **Plain rubber** — cheaper, best for impact-dominated or fine-abrasion duty; loses to ceramic on severe sliding wear.
- **Bare ceramic tile** — excellent abrasion resistance but brittle under impact and harder to fit to curved surfaces.
- **Ceramic embedded rubber** — the middle ground that handles real-world transfer-point duty, where impact and abrasion happen together.

## Fitting and coverage

We supply and install ceramic embedded rubber wear panels as part of our [conveyor and chute work](/conveyor-components), alongside pulley lagging, skirt rubber and impact bars. Panels are specified to the wear pattern at each point rather than applied as one blanket grade — which is how you get the cost-to-life balance right.

You can see them in service in our [project case studies](/projects/ceramic-embedded-rubber-wear-panels).

## Worth a look at your worst transfer point?

Tell us where you are replacing rubber most often and we will assess whether ceramic embedded rubber will pay back, and quote it from Boksburg.

[Request a quote](/quote) or [contact us](/contact).`,
  },
  {
    slug: "rubber-lining-thickness-and-wear-life",
    title: "How to Specify Rubber Lining Thickness and Extend Wear Life",
    metaTitle: "Rubber Lining Thickness & Wear Life Guide | AU Industries",
    metaDescription:
      "How rubber lining thickness, compound and inspection drive wear life in mining slurry duty — and the common mistakes that cut linings short. AU Industries, Boksburg.",
    excerpt:
      "Thickness, compound and inspection together decide how long a lining lasts. Here's how to specify it for your duty and avoid the mistakes that cut linings short.",
    heroImageUrl: "/au-industries/gallery/gallery44.jpg",
    content: `Lining thickness is not a number you copy from the last job — it is a trade-off between wear life, cost and the duty in front of you. Specify it well and you size the re-line interval to fit your shutdown schedule instead of fighting it.

## Thickness buys wear life — to a point

More thickness means more sacrificial rubber, so more time between re-lines. But thickness alone is not the answer: a thick lining of the wrong compound still wears fast, and over-speccing thickness on a light duty wastes money and adds weight. The right approach is to match thickness to how aggressive the duty is, and the compound to the wear mechanism.

## What drives the specification

- **Particle size and velocity** — fine, fast slurry polishes; coarse, slow material gouges. Faster and more abrasive duties justify more thickness.
- **Compound** — a resilient 40 Shore for fine slurry, a harder 60 Shore for impact, or [A38 premium](/rubber-compound) where you want the longest possible life. Get this wrong and thickness cannot save you.
- **Target re-line interval** — line the equipment to last to your next planned shutdown, not to fail between them. A breakthrough that damages the steel substrate is far more expensive than the rubber.
- **Geometry** — bends, weld seams and discharge points wear faster than straight runs and may need local reinforcement.

Typical [rubber lining](/rubber-lining) and sheeting thicknesses run from a few millimetres up to 25 mm depending on duty.

## Extending the life of what you have

- **Inspect on a schedule** — catching a worn liner during a planned inspection is far cheaper than a slurry breakthrough. Spark testing and visual checks find thin spots before they fail.
- **Rotate or reposition** where geometry allows, so wear is spread rather than concentrated.
- **Re-line locally** — often only the high-wear sections need attention, not the whole component.
- **Use a maintenance contract** — scheduled inspections and replacements prevent the unplanned failures that cause real downtime. That is what our [site maintenance](/site-maintenance) service is built for.

## Common mistakes that cut linings short

- Choosing thickness by habit instead of duty.
- Using a fine-slurry compound in an impact zone (or vice versa).
- Skipping surface preparation, so the lining debonds long before it wears out.
- Letting a liner run to breakthrough and damaging the steel underneath.

## Get the spec right the first time

Send us your process conditions — particle size, slurry concentration, velocity and geometry — and we will recommend the compound and thickness, and quote it from our Boksburg facility.

[Request a quote](/quote) or [contact us](/contact).`,
  },
];

const main = async () => {
  await mongoose.connect(uri, { dbName });
  const col = mongoose.connection.collection("blog_post");
  const nowDate = new Date();

  for (const post of POSTS) {
    const existing = await col.findOne({ slug: post.slug });
    if (existing) {
      console.log(`SKIP  ${post.slug} (already exists)`);
      continue;
    }
    if (!APPLY) {
      console.log(`DRY   ${post.slug}  (${post.content.length} chars)`);
      continue;
    }
    await col.insertOne({
      _id: randomUUID(),
      slug: post.slug,
      title: post.title,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      excerpt: post.excerpt,
      content: post.content,
      heroImageUrl: post.heroImageUrl,
      author: AUTHOR,
      publishedAt: null,
      isPublished: false,
      createdAt: nowDate,
      updatedAt: nowDate,
    });
    console.log(`INSERTED  ${post.slug}  (draft, ${post.content.length} chars)`);
  }

  if (!APPLY) {
    console.log("\nDRY RUN — pass --apply to insert the drafts.");
  }
  await mongoose.disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
