"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function AuIndustriesProductsPage() {
  useEffect(() => {
    document.title = "Products, Projects & Services | AU Industries";
  }, []);

  return (
    <div>
      <section
        className="relative h-56 md:h-72 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/au-industries/AUI-banner7.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex items-center justify-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider text-center">
            Products, Projects &amp; Services
          </h1>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wider mb-2">
                Rubber Compound
              </h2>
              <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-8" />
              <p className="text-[#B8860B] text-lg leading-relaxed mb-6">
                AU has created its own rubber formulations to offer the highest quality rubber
                compound, sheeting and other rubber products in each category it supplies.
              </p>
              <p className="text-gray-700 text-base leading-relaxed text-justify mb-6">
                Our aim is to raise the bar in terms of quality and life span of our products which
                in turn will give better value for money, and less down time in mining operations
                globally. We have the ability to offer custom made compounds and products that can
                be tweaked to match each individual processing plant, thus streamlining the surface
                protection of the steel work and increasing the lifespan of those items which our
                rubber is applied to.
              </p>
              <Link
                href="/au-industries/contact"
                className="inline-block px-10 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
              >
                Enquire Here
              </Link>
            </div>
            <div className="relative h-80 md:h-[420px] rounded overflow-hidden shadow-lg">
              <Image
                src="/au-industries/aui-rubber02.jpg"
                alt="Rubber compound"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 md:h-[420px] rounded overflow-hidden shadow-lg order-2 md:order-1">
              <Image
                src="/au-industries/aui-rubber03.jpg"
                alt="Rubber sheeting"
                fill
                className="object-cover"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wider mb-2">
                Rubber Sheeting
              </h2>
              <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-8" />
              <p className="text-[#B8860B] text-lg leading-relaxed mb-6">
                At AU Industries we pride ourselves on offering the highest quality of rubber
                sheeting available for each level required by the industry, at the best possible
                prices for the quality on offer. We have extensive experience in the quality of
                product that is required and pride ourselves in our delivery times on orders placed.
              </p>
              <Link
                href="/au-industries/contact"
                className="inline-block px-10 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors mb-8"
              >
                Enquire Here
              </Link>
            </div>
          </div>
          <div className="mt-12 text-gray-300 text-base leading-relaxed text-justify">
            <p className="mb-4">
              Our current portfolio includes a low abrasion loss 40 shore Natural Rubber Red &amp;
              Black designed to extend the life of pipes and tanks in a slurry application, a high
              quality 60 shore Natural Rubber Red &amp; Black great for tanks and chutes which have
              larger particle sizes and with a better impact resistance, a 50 Shore Bromobutyl which
              necessitate superior resistance to mineral acids, saltwater, rainwater, acidic or
              alkaline solutions, and a 60 Shore Nitrile that exhibits excellent resistance to oils,
              fuels, and hydrocarbons, making it suitable for applications involving prolonged
              exposure to such substances.
            </p>
            <p>
              We also have a premium range of rubber sheeting and can offer custom made solutions to
              suit the particular process and material that is running through the mining plant.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wider mb-2">
                Products
              </h2>
              <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-8" />
              <p className="text-gray-700 text-base leading-relaxed text-justify mb-4">
                Engineered for the toughest mining environments, our rubber products deliver
                unmatched durability and performance. From heavy-duty seals and gaskets to advanced
                moulded components, we provide solutions that stand up to extreme abrasion, impact,
                and chemical exposure. Our Ceramic Embedded Wear Pads offer superior wear
                resistance, extending equipment life and reducing maintenance downtime. Trusted by
                mining professionals, our products are built to keep your operations running longer,
                safer, and more efficiently.
              </p>
              <p className="text-gray-700 text-base leading-relaxed text-justify mb-6">
                Our mining process is built on precision, safety, and efficiency — ensuring reliable
                material handling and reduced downtime in even the most demanding environments.
                Supporting this is our dedicated Rubber R&amp;D Department, where innovation meets
                performance. Through continuous research and material testing, we develop advanced
                rubber compounds tailored for extreme mining conditions. From concept to
                application, our team drives solutions that enhance durability, reduce wear, and
                push the boundaries of what&apos;s possible in mining technology.
              </p>
              <Link
                href="/au-industries/contact"
                className="inline-block px-10 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
              >
                Enquire Here
              </Link>
            </div>
            <div className="relative h-80 md:h-[420px] rounded overflow-hidden shadow-lg">
              <Image
                src="/au-industries/aui-rubber04.jpg"
                alt="Ceramic embedded rubber products"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wider mb-2">
                Projects and Services
              </h2>
              <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-8" />
              <p className="text-[#B8860B] text-lg leading-relaxed mb-6">
                AU, with its partners and combined 40 years&apos; experience, can offer a variety of
                difference Services to its clients.
              </p>
              <Link
                href="/au-industries/quote"
                className="inline-block px-10 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
              >
                Request a Quote
              </Link>
            </div>
            <div className="text-gray-300 text-base leading-relaxed text-justify">
              <p className="mb-4">
                Whether it be fabricating, lining and coating replacement parts for any area of the
                mines, or full project fabrication, management and quality control, we are able to
                call upon our various partners to complete small and large projects.
              </p>
              <p>
                We can advise on correct pressure ratings of pipes and fittings, rubber type and
                thickness to different lifespans, external or internal coating specifications and
                other items such as pumps, valves and spares needed in the mining process. We also
                offer other lining capabilities such as ceramic &amp; silicon carbide linings,
                Polyurethane and HDPE linings, and Straight supply of HDPE &amp; PVC piping and
                fittings.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <p className="text-[#B8860B] text-lg leading-relaxed">
                AU has partnered with multiple approved site maintenance teams in different regions
                of South Africa, to be able to offer our high-end products in onsite situations and
                solutions.
              </p>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wider mb-2">
                Site Work and Maintenance
              </h2>
              <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-8" />
              <p className="text-gray-700 text-base leading-relaxed text-justify mb-6">
                We also have partners in other countries such as Mozambique, Zambia, Namibia,
                Botswana &amp; Zimbabwe, among other countries, that enable us together to complete
                site and project work into Africa.
              </p>
              <Link
                href="/au-industries/contact"
                className="inline-block px-10 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
              >
                Request More Information
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
