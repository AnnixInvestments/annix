"use client";

import Image from "next/image";
import Link from "next/link";

export default function AuIndustriesHomePage() {
  return (
    <div>
      <section
        className="relative h-[550px] md:h-[650px] bg-cover bg-center"
        style={{ backgroundImage: "url(/au-industries/hero-excavator.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wider leading-tight mb-10">
            Rubber Products, Linings and Mining Solutions in Boksburg
          </h1>
          <Link
            href="/au-industries/products-and-services"
            className="inline-block px-12 py-4 bg-[#B8860B] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
          >
            Our Services
          </Link>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#B8860B] uppercase tracking-wider">
            About Us
          </h2>
          <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-10" />

          <h3 className="text-2xl text-[#B8860B] mb-8">Who we are</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-gray-700 text-base leading-relaxed text-justify">
            <p>
              <strong className="text-gray-900">AU Industries</strong> was established to deliver
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
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative h-[400px] md:h-[500px] bg-gray-900 flex items-center justify-center gap-4 p-8">
            <div className="relative w-1/2 h-[80%] rounded overflow-hidden shadow-lg">
              <Image
                src="/au-industries/hero-home.jpg"
                alt="Rubber lined pipes"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative w-1/2 h-[80%] rounded overflow-hidden shadow-lg">
              <Image
                src="/au-industries/home-06.jpg"
                alt="Red rubber sheeting"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="bg-gray-900 text-white p-8 md:p-12 flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider mb-2">
              Products and Services
            </h2>
            <div className="w-20 h-[3px] bg-[#B8860B] mb-6" />
            <p className="text-gray-300 text-base leading-relaxed text-justify mb-6">
              AU Industries supplies rubber products, linings, fabrication, and mining equipment
              with fast turnaround times. Whatever your mining project requires, we source quality
              materials, provide expert options, and deliver reliable solutions.
            </p>
            <ul className="space-y-2 text-gray-300 mb-8">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                Full Mining Projects
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                Small Projects and Spares
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                Rubber Compound &amp; Sheeting
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                Rubber Linings &amp; Mouldings
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                Pipe, Tank &amp; Chute Fabrication
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-[#B8860B] rounded-full mr-3 flex-shrink-0" />
                Other Mining Consumables
              </li>
            </ul>
            <Link
              href="/au-industries/products-and-services"
              className="inline-block self-start px-8 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#B8860B] uppercase tracking-wider mb-2">
            Why AU Industries?
          </h2>
          <div className="w-24 h-[3px] bg-[#B8860B] mx-auto mt-3 mb-12" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-[#B8860B] mb-2">40+</div>
              <p className="text-gray-600 text-sm">Years combined industry experience</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#B8860B] mb-2">R&amp;D</div>
              <p className="text-gray-600 text-sm">Custom rubber compounds developed in-house</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#B8860B] mb-2">5+</div>
              <p className="text-gray-600 text-sm">Countries serviced across Southern Africa</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#B8860B] mb-2">24h</div>
              <p className="text-gray-600 text-sm">Fast turnaround on quotes and deliveries</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Ready to discuss your project?
          </h2>
          <p className="text-gray-600 mb-8">
            Get in touch for a free consultation and competitive quote.
          </p>
          <Link
            href="/au-industries/contact"
            className="inline-block px-10 py-4 bg-[#B8860B] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
