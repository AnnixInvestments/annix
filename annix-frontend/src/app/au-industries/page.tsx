import { isString } from "es-toolkit/compat";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { type CaseStudy, projectCaseStudies } from "./caseStudies";

const DEFAULT_HERO_IMAGE = "/au-industries/gallery/gallery29.jpg";

function recentProjects(): CaseStudy[] {
  return [...projectCaseStudies()].sort((a, b) => b.dateISO.localeCompare(a.dateISO)).slice(0, 4);
}

// Fetched server-side so the real CMS hero is in the initial HTML with
// fetchpriority=high. A client-side fetch left the LCP image undiscoverable
// until after hydration — the homepage's main LCP cost.
async function fetchHeroImage(): Promise<string> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];
  if (host.length === 0) {
    return DEFAULT_HERO_IMAGE;
  }
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  try {
    const res = await fetch(`${protocol}://${host}/api/public/au-industries/home`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return DEFAULT_HERO_IMAGE;
    }
    const data = await res.json();
    const url = data?.heroImageUrl;
    return isString(url) && url.length > 0 ? url : DEFAULT_HERO_IMAGE;
  } catch {
    return DEFAULT_HERO_IMAGE;
  }
}

export default async function AuIndustriesHomePage(): Promise<React.JSX.Element> {
  const heroImage = await fetchHeroImage();

  return (
    <div>
      <section className="relative h-[550px] md:h-[650px]">
        <Image
          src={heroImage}
          alt="AU Industries rubber lining and mining solutions facility"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wider leading-tight mb-10">
            Rubber Products, Linings and Mining Solutions in Boksburg
          </h1>
          <Link
            href="/products-and-services"
            className="inline-block px-12 py-4 bg-[#8A6608] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors"
          >
            Our Services
          </Link>
        </div>
      </section>

      <section className="bg-[#fdf8e8] py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#B8860B] uppercase tracking-wider">
            About Us
          </h2>
          <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-10" />

          <h3 className="text-2xl text-[#B8860B] mb-8">Who we are</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-black text-base leading-relaxed text-justify">
            <p>
              <strong className="text-black">AU Industries</strong> was established to deliver
              high-quality rubber products, linings, and mining solutions at competitive prices with
              fast turnaround times. With over 40 years of combined experience, we aim to be a
              trusted one-stop partner for the mining industry, supplying equipment, spare parts,
              and full project support. Our expertise includes specifying and installing the correct
              rubber lining, ceramic lining, HDPE lining, and uPVC pipe solutions for pipes, tanks,
              chutes, pulleys, pumps, and other mining infrastructure.
            </p>
            <p>
              We work closely with leading local manufacturers to produce custom rubber compounds
              and precision rubber mouldings. Our range includes durable rubber sheeting, rubber
              wear pads, rubber hoses, and ceramic embedded rubber products designed to withstand
              the toughest mining environments. We also supply and fabricate HDPE pipes and
              fittings, uPVC pipes and fittings, pumps, pump parts, valves, and dust suppression
              powder. Whether it&apos;s pipe fabrication, tank fabrication, chute fabrication, or
              pulley lagging, AU Industries provides tailored solutions to meet every mining and
              industrial requirement.
            </p>
          </div>
        </div>
      </section>

      <section className="relative">
        <Image
          src="/au-industries/AUI-homeparallax.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative grid grid-cols-1 md:grid-cols-2">
          <div className="h-[500px] md:h-[600px] flex items-center justify-center p-8">
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                <Image
                  src="/au-industries/aui-home01.jpg"
                  alt="Rubber lined pipes in warehouse"
                  fill
                  sizes="(max-width: 768px) 50vw, 240px"
                  className="object-cover"
                />
              </div>
              <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                <Image
                  src="/au-industries/aui-home05.jpg"
                  alt="Red rubber sheeting"
                  fill
                  sizes="(max-width: 768px) 50vw, 240px"
                  className="object-cover"
                />
              </div>
              <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                <Image
                  src="/au-industries/aui-home04.jpg"
                  alt="Rubber manufacturing"
                  fill
                  sizes="(max-width: 768px) 50vw, 240px"
                  className="object-cover"
                />
              </div>
              <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                <Image
                  src="/au-industries/aui-home06.jpg"
                  alt="Rubber sheeting machine"
                  fill
                  sizes="(max-width: 768px) 50vw, 240px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          <div className="text-white p-8 md:p-12 flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider mb-2">
              Products and Services
            </h2>
            <div className="w-20 h-[3px] bg-[#B8860B] mb-6" />
            <p className="text-gray-300 text-base leading-relaxed text-justify mb-6">
              AU Industries supplies rubber products, linings, fabrication, and mining equipment
              with fast turnaround times. Whatever your mining project requires, we source quality
              materials, provide expert options, and deliver reliable solutions.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-gray-300 mb-8">
              <li>
                <Link
                  href="/rubber-lining"
                  className="flex items-center hover:text-[#efcc54] transition-colors"
                >
                  <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                  Rubber Lining
                </Link>
              </li>
              <li>
                <Link
                  href="/rubber-sheeting"
                  className="flex items-center hover:text-[#efcc54] transition-colors"
                >
                  <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                  Rubber Sheeting
                </Link>
              </li>
              <li>
                <Link
                  href="/rubber-compound"
                  className="flex items-center hover:text-[#efcc54] transition-colors"
                >
                  <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                  Rubber Compound
                </Link>
              </li>
              <li>
                <Link
                  href="/hdpe-piping"
                  className="flex items-center hover:text-[#efcc54] transition-colors"
                >
                  <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                  HDPE Piping
                </Link>
              </li>
              <li>
                <Link
                  href="/mining-solutions"
                  className="flex items-center hover:text-[#efcc54] transition-colors"
                >
                  <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                  Mining Solutions
                </Link>
              </li>
              <li>
                <Link
                  href="/conveyor-components"
                  className="flex items-center hover:text-[#efcc54] transition-colors"
                >
                  <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                  Conveyor Components
                </Link>
              </li>
              <li>
                <Link
                  href="/site-maintenance"
                  className="flex items-center hover:text-[#efcc54] transition-colors"
                >
                  <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                  Site Maintenance
                </Link>
              </li>
              <li>
                <Link
                  href="/rubber-rolls"
                  className="flex items-center hover:text-[#efcc54] transition-colors"
                >
                  <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                  Rubber Rolls
                </Link>
              </li>
            </ul>
            <Link
              href="/products-and-services"
              className="inline-block self-start px-8 py-3 bg-[#8A6608] text-white font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-10">
        <Image
          src="/au-industries/AUI-banner2.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="elfsight-app-4c13c174-7edd-4de9-b428-dc35d38ec263"
            data-elfsight-app-lazy
          />
        </div>
      </section>

      <section className="relative py-20">
        <Image
          src="/au-industries/AUI-banner6.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#efcc54] uppercase tracking-wider mb-2">
            Projects
          </h2>
          <div className="w-24 h-[3px] bg-[#efcc54] mx-auto mt-3 mb-4" />
          <p className="text-gray-300 text-lg mb-10">Some of our projects</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {recentProjects().map((study) => {
              const heroPhoto = study.photos[0];
              return (
                <Link
                  key={study.slug}
                  href={`/projects/${study.slug}`}
                  className="group relative h-64 overflow-hidden rounded-xl shadow-md border-2 border-white block"
                >
                  <Image
                    src={`/au-industries/gallery/${heroPhoto.src}`}
                    alt={heroPhoto.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 290px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                    <span className="block text-xs uppercase tracking-widest text-[#efcc54] font-semibold mb-1">
                      {study.dateLabel}
                    </span>
                    <span className="block text-sm font-bold text-white leading-snug line-clamp-2">
                      {study.title}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <Link
            href="/projects"
            className="inline-block px-10 py-4 bg-[#8A6608] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors"
          >
            View Project Case Studies
          </Link>
        </div>
      </section>

      <section className="relative">
        <Image
          src="/au-industries/history-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider mb-2">
                The History of Rubber
              </h2>
              <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-8" />
              <p className="text-white text-lg leading-relaxed mb-8">
                The biggest producer of rubber is Thailand, followed by Indonesia, Vietnam, India
                and China. Most of the rubber is produced in South-East Asia and Asia followed by
                Africa and Central America.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative h-48 overflow-hidden rounded-xl border-2 border-white">
                  <Image
                    src="/au-industries/rubbertree01.jpg"
                    alt="Rubber tree tapping"
                    fill
                    sizes="(max-width: 1024px) 48vw, 310px"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-48 overflow-hidden rounded-xl border-2 border-white">
                  <Image
                    src="/au-industries/rubbertree02.jpg"
                    alt="Rubber tree plantation"
                    fill
                    sizes="(max-width: 1024px) 48vw, 310px"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-48 overflow-hidden rounded-xl border-2 border-white">
                  <Image
                    src="/au-industries/rubbertree03.jpg"
                    alt="Rubber tree bark"
                    fill
                    sizes="(max-width: 1024px) 48vw, 310px"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-48 overflow-hidden rounded-xl border-2 border-white">
                  <Image
                    src="/au-industries/rubbertree04.jpg"
                    alt="Latex collection"
                    fill
                    sizes="(max-width: 1024px) 48vw, 310px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-2">
                Early Uses by Indigenous Cultures
              </h2>
              <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-8" />
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-3">
                    Olmec, Maya, and Aztec Civilizations:
                  </h3>
                  <p className="text-gray-200 text-sm leading-relaxed text-justify">
                    These Mesoamerican cultures were among the first to harness the latex sap from
                    the rubber tree (primarily Hevea brasiliensis in the Amazon rainforest) for
                    various purposes.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-3">Rubber Balls:</h3>
                  <p className="text-gray-200 text-sm leading-relaxed text-justify">
                    Indigenous populations used rubber to create balls for their ball games, which
                    were often religious or recreational in nature.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-3">Waterproofing:</h3>
                  <p className="text-gray-200 text-sm leading-relaxed text-justify">
                    The latex was also used to make clothing and other items waterproof.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-3">Other Applications:</h3>
                  <p className="text-gray-200 text-sm leading-relaxed text-justify">
                    They also used it for containers, shoes, and even to decorate canoes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to discuss your project?
          </h2>
          <p className="text-gray-300 mb-8">
            Get in touch for a free consultation and competitive quote.
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 bg-[#8A6608] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
