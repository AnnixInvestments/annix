"use client";

import Image from "next/image";
import { useEffect } from "react";

interface GalleryImage {
  src: string;
  alt: string;
}

interface GallerySection {
  title: string;
  images: GalleryImage[];
}

const gallerySections: GallerySection[] = [
  {
    title: "Fittings lined with AU 40 Black for a mine in Namibia — July 2025",
    images: [
      { src: "gallery52.jpg", alt: "AU 40 Black rubber lined flanged fitting for Namibian mine" },
      { src: "gallery53.jpg", alt: "Interior view of AU 40 Black rubber lined pipe fitting" },
      {
        src: "gallery54.jpg",
        alt: "Completed AU 40 Black lined fittings ready for dispatch to Namibia",
      },
    ],
  },
  {
    title: "Fittings lined with AU premium 60 Shore for a mine in Mozambique — July 2025",
    images: [
      { src: "gallery50.jpg", alt: "AU premium 60 Shore rubber lined fitting for Mozambique mine" },
      { src: "gallery51.jpg", alt: "Finished 60 Shore rubber lined pipe fittings" },
    ],
  },
  {
    title: "Ceramic Embedded Rubber hoses for a mine in Mozambique — July 2025",
    images: [
      { src: "gallery47.jpg", alt: "Ceramic embedded rubber hose section showing embedded tiles" },
      { src: "gallery48.jpg", alt: "Ceramic rubber hose assembly for Mozambique mining operation" },
      { src: "gallery49.jpg", alt: "Completed ceramic embedded rubber hoses ready for shipping" },
    ],
  },
  {
    title: "Pipes lined with 12mm AU 40 Red for a mine in Limpopo — July 2025",
    images: [
      { src: "gallery44.jpg", alt: "12mm AU 40 Red rubber lined pipe interior view" },
      { src: "gallery45.jpg", alt: "Red rubber lined steel pipe for Limpopo mine project" },
      { src: "gallery46.jpg", alt: "Batch of AU 40 Red lined pipes ready for delivery to Limpopo" },
    ],
  },
  {
    title: "Pipes and fittings lined with AU 40 Black for a uranium mine in Namibia — June 2025",
    images: [
      { src: "gallery41.jpg", alt: "AU 40 Black lined pipe for uranium mine in Namibia" },
      { src: "gallery42.jpg", alt: "Rubber lined fitting showing black natural rubber interior" },
      {
        src: "gallery43.jpg",
        alt: "Completed lined pipes and fittings for Namibian uranium project",
      },
    ],
  },
  {
    title:
      "Pipes lined with a custom compound developed by AU for their process in West Africa — June 2025",
    images: [
      { src: "gallery38.jpg", alt: "Custom compound rubber lined pipe for West Africa project" },
      { src: "gallery39.jpg", alt: "AU custom rubber compound lining applied to steel pipe" },
      { src: "gallery40.jpg", alt: "Lined pipes with bespoke AU compound for West African mine" },
    ],
  },
  {
    title: "HDPE project for a customer in Mozambique — June 2025",
    images: [
      { src: "gallery35.jpg", alt: "HDPE pipe sections fabricated for Mozambique project" },
      { src: "gallery36.jpg", alt: "HDPE piping installation components for mining operation" },
      { src: "gallery37.jpg", alt: "Completed HDPE pipe delivery for Mozambique customer" },
    ],
  },
  {
    title: "Various rolls of AU rubber delivered — June 2025",
    images: [
      { src: "gallery32.jpg", alt: "Rolls of AU natural rubber sheeting on delivery truck" },
      { src: "gallery33.jpg", alt: "Stacked rubber sheeting rolls in AU Industries warehouse" },
      { src: "gallery34.jpg", alt: "AU rubber rolls prepared for customer delivery" },
    ],
  },
  {
    title: "AU A38 Pink Rubber rolls being manufactured — May 2025",
    images: [
      { src: "gallery29.jpg", alt: "AU A38 Pink rubber sheeting on manufacturing calender" },
      { src: "gallery30.jpg", alt: "Pink rubber compound being processed through rolling mill" },
      { src: "gallery31.jpg", alt: "Finished AU A38 Pink rubber rolls after manufacturing" },
    ],
  },
  {
    title: "AU's premium A38 pink rubber compound — May 2025",
    images: [
      { src: "gallery26.jpg", alt: "AU premium A38 pink rubber compound block" },
      { src: "gallery27.jpg", alt: "A38 pink rubber compound showing colour and texture" },
      { src: "gallery28.jpg", alt: "Batch of AU A38 premium pink rubber compound" },
    ],
  },
  {
    title: "New ceramic embedded rubber wear panels — May 2025",
    images: [
      { src: "gallery22.jpg", alt: "Ceramic embedded rubber wear panel showing tile pattern" },
      { src: "gallery23.jpg", alt: "Close-up of ceramic tiles bonded into rubber wear panel" },
      { src: "gallery25.jpg", alt: "Set of ceramic embedded rubber panels for chute lining" },
    ],
  },
  {
    title: "AU 40 shore black natural rubber compound — April 2025",
    images: [
      { src: "gallery12.jpg", alt: "AU 40 shore black natural rubber compound sample" },
      { src: "gallery13.jpg", alt: "Black rubber compound block showing consistency" },
      { src: "gallery15.jpg", alt: "AU 40 shore black compound prepared for sheeting production" },
    ],
  },
  {
    title: "AU 40 shore black rubber sheet manufacturing — April 2025",
    images: [
      { src: "gallery14.jpg", alt: "Black rubber sheeting on calender during manufacturing" },
      { src: "gallery16.jpg", alt: "40 shore black rubber sheet being rolled after calendering" },
      { src: "gallery17.jpg", alt: "Finished AU 40 shore black rubber sheet rolls" },
    ],
  },
  {
    title: "Red 40 shore pipe for a platinum mine in Mpumalanga — Oct 2024",
    images: [
      { src: "gallery02.jpg", alt: "AU Red 40 shore rubber lined pipe for platinum mine" },
      { src: "gallery04.jpg", alt: "Interior red rubber lining of steel pipe for Mpumalanga mine" },
      { src: "gallery20.jpg", alt: "Completed red rubber lined pipes for platinum mine delivery" },
    ],
  },
  {
    title: "AU red rubber lined fittings for a titanium mine in Mozambique — Sept 2024",
    images: [
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
    title: "AU red rubber lined fittings for a titanium mine in Mozambique — July 2024",
    images: [
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
    title: "Rubber Lined Pipes and Chutes for a Titanium Mine in Mozambique — June 2022",
    images: [
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
    title: "Rubber lined and HDPE pipes for copper mine in Limpopo — Sept 2021",
    images: [
      { src: "gallery05.jpg", alt: "Rubber lined steel pipe for Limpopo copper mine" },
      { src: "gallery08.jpg", alt: "HDPE pipe sections prepared for copper mine installation" },
      {
        src: "projectgallery23.jpg",
        alt: "Combined rubber lined and HDPE pipe delivery for copper mine",
      },
    ],
  },
];

function GalleryCard(props: { section: GallerySection }) {
  const imageCount = props.section.images.length;
  return (
    <div>
      <div className="bg-[#efcc54] text-gray-900 text-center py-4 px-4 uppercase font-bold text-sm tracking-wide leading-snug">
        {props.section.title}
      </div>
      <div className={`grid ${imageCount === 2 ? "grid-cols-2" : "grid-cols-3"} gap-0.5`}>
        {props.section.images.map((img) => (
          <div key={img.src} className="relative h-32 sm:h-36 md:h-40">
            <Image
              src={`/au-industries/gallery/${img.src}`}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 250px"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuIndustriesGalleryPage() {
  useEffect(() => {
    document.title = "Project Gallery | AU Industries";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Browse AU Industries project gallery showcasing rubber lining, ceramic embedded rubber, HDPE piping and mining solutions across South Africa, Mozambique and Namibia.",
      );
    }
  }, []);

  const pairs: GallerySection[][] = [];
  for (let i = 0; i < gallerySections.length; i += 2) {
    const pair = [gallerySections[i]];
    if (i + 1 < gallerySections.length) {
      pair.push(gallerySections[i + 1]);
    }
    pairs.push(pair);
  }

  return (
    <div>
      <section className="bg-[#efcc54] py-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 uppercase tracking-wider">
            Gallery
          </h1>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-[#B8860B] text-lg mb-12">
            Below are a few images of our products, projects and services
          </p>

          <div className="space-y-12">
            {pairs.map((pair, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {pair.map((section) => (
                  <GalleryCard key={section.title} section={section} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
