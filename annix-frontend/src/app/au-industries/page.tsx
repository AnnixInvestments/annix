"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserBaseUrl } from "@/lib/api-config";

const DEFAULT_HERO_IMAGE = "/au-industries/gallery/gallery29.jpg";

export default function AuIndustriesHomePage(): React.JSX.Element {
  const [heroImage, setHeroImage] = useState(DEFAULT_HERO_IMAGE);

  useEffect(() => {
    const base = browserBaseUrl();
    fetch(`${base}/public/au-industries/home`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const url = data?.heroImageUrl;
        if (url) {
          setHeroImage(url);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <section
        className="relative h-[550px] md:h-[650px] bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wider leading-tight mb-10">
            Rubber Products, Linings and Mining Solutions in Boksburg
          </h1>
          <Link
            href="/products-and-services"
            className="inline-block px-12 py-4 bg-[#B8860B] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
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

      <section
        className="relative bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/au-industries/AUI-homeparallax.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative grid grid-cols-1 md:grid-cols-2">
          <div className="h-[500px] md:h-[600px] flex items-center justify-center p-8">
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                <Image
                  src="/au-industries/aui-home01.jpg"
                  alt="Rubber lined pipes in warehouse"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                <Image
                  src="/au-industries/aui-home05.jpg"
                  alt="Red rubber sheeting"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                <Image
                  src="/au-industries/aui-home04.jpg"
                  alt="Rubber manufacturing"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                <Image
                  src="/au-industries/aui-home06.jpg"
                  alt="Rubber sheeting machine"
                  fill
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
              className="inline-block self-start px-8 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      <section
        className="relative py-10 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/au-industries/AUI-banner2.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="elfsight-app-4c13c174-7edd-4de9-b428-dc35d38ec263"
            data-elfsight-app-lazy
          />
        </div>
      </section>

      <section
        className="relative py-20 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/au-industries/AUI-banner6.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#efcc54] uppercase tracking-wider mb-2">
            Projects
          </h2>
          <div className="w-24 h-[3px] bg-[#efcc54] mx-auto mt-3 mb-4" />
          <p className="text-gray-300 text-lg mb-10">Some of our projects</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="relative h-64 overflow-hidden rounded-xl shadow-md border-2 border-white">
              <Image
                src="/au-industries/projects-01.jpg"
                alt="Rubber lining installation"
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="relative h-64 overflow-hidden rounded-xl shadow-md border-2 border-white">
              <Image
                src="/au-industries/projects-02.jpg"
                alt="Blue rubber lined pipes"
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="relative h-64 overflow-hidden rounded-xl shadow-md border-2 border-white">
              <Image
                src="/au-industries/projects-03.jpg"
                alt="Ceramic embedded rubber products"
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="relative h-64 overflow-hidden rounded-xl shadow-md border-2 border-white">
              <Image
                src="/au-industries/projects-04.jpg"
                alt="Pipe fabrication and delivery"
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          <Link
            href="/gallery"
            className="inline-block px-10 py-4 bg-[#B8860B] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
          >
            View More Projects
          </Link>
        </div>
      </section>

      <section
        className="relative bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/au-industries/history-bg.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#B8860B] uppercase tracking-wider mb-2">
                The History of Rubber
              </h2>
              <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-8" />
              <p className="text-[#B8860B] text-lg leading-relaxed mb-8">
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
                    className="object-cover"
                  />
                </div>
                <div className="relative h-48 overflow-hidden rounded-xl border-2 border-white">
                  <Image
                    src="/au-industries/rubbertree02.jpg"
                    alt="Rubber tree plantation"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative h-48 overflow-hidden rounded-xl border-2 border-white">
                  <Image
                    src="/au-industries/rubbertree03.jpg"
                    alt="Rubber tree bark"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative h-48 overflow-hidden rounded-xl border-2 border-white">
                  <Image
                    src="/au-industries/rubbertree04.jpg"
                    alt="Latex collection"
                    fill
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
                  <h3 className="text-xl font-bold text-[#B8860B] mb-3">
                    Olmec, Maya, and Aztec Civilizations:
                  </h3>
                  <p className="text-gray-200 text-sm leading-relaxed text-justify">
                    These Mesoamerican cultures were among the first to harness the latex sap from
                    the rubber tree (primarily Hevea brasiliensis in the Amazon rainforest) for
                    various purposes.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-xl font-bold text-[#B8860B] mb-3">Rubber Balls:</h3>
                  <p className="text-gray-200 text-sm leading-relaxed text-justify">
                    Indigenous populations used rubber to create balls for their ball games, which
                    were often religious or recreational in nature.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-xl font-bold text-[#B8860B] mb-3">Waterproofing:</h3>
                  <p className="text-gray-200 text-sm leading-relaxed text-justify">
                    The latex was also used to make clothing and other items waterproof.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-xl font-bold text-[#B8860B] mb-3">Other Applications:</h3>
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
            className="inline-block px-10 py-4 bg-[#B8860B] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
