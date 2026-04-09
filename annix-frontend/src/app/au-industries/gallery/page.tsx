"use client";

import Image from "next/image";
import { useEffect } from "react";

interface GallerySection {
  title: string;
  images: string[];
}

const gallerySections: GallerySection[] = [
  {
    title: "Fittings lined with AU 40 Black for a mine in Namibia — July 2025",
    images: ["gallery52.jpg", "gallery53.jpg", "gallery54.jpg"],
  },
  {
    title: "Fittings lined with AU premium 60 Shore for a mine in Mozambik — July 2025",
    images: ["gallery50.jpg", "gallery51.jpg"],
  },
  {
    title: "Ceramic Embedded Rubber hoses for a mine in Mozambik — July 2025",
    images: ["gallery47.jpg", "gallery48.jpg", "gallery49.jpg"],
  },
  {
    title: "Pipes lined with 12mm AU 40 Red for a mine in Limpopo — July 2025",
    images: ["gallery44.jpg", "gallery45.jpg", "gallery46.jpg"],
  },
  {
    title: "Pipes and fittings lined with AU 40 Black for a uranium mine in Namibia — June 2025",
    images: ["gallery41.jpg", "gallery42.jpg", "gallery43.jpg"],
  },
  {
    title:
      "Pipes lined with a custom compound developed by AU for there process in West Africa — June 2025",
    images: ["gallery38.jpg", "gallery39.jpg", "gallery40.jpg"],
  },
  {
    title: "HDPE project for a customer in Mozambique — June 2025",
    images: ["gallery35.jpg", "gallery36.jpg", "gallery37.jpg"],
  },
  {
    title: "Various rolls of AU rubber delivered — June 2025",
    images: ["gallery32.jpg", "gallery33.jpg", "gallery34.jpg"],
  },
  {
    title: "AU A38 Pink Rubber rolls being manufactured — May 2025",
    images: ["gallery29.jpg", "gallery30.jpg", "gallery31.jpg"],
  },
  {
    title: "AU's premium A38 pink rubber compound — May 2025",
    images: ["gallery26.jpg", "gallery27.jpg", "gallery28.jpg"],
  },
  {
    title: "New ceramic embedded rubber wear panels — May 2025",
    images: ["gallery22.jpg", "gallery23.jpg", "gallery25.jpg"],
  },
  {
    title: "AU 40 shore black natural rubber compound — April 2025",
    images: ["gallery12.jpg", "gallery13.jpg", "gallery15.jpg"],
  },
  {
    title: "AU 40 shore black rubber sheet manufacturing — April 2025",
    images: ["gallery14.jpg", "gallery16.jpg", "gallery17.jpg"],
  },
  {
    title: "Red 40 shore pipe for a platinum mine in Mpumalanga — Oct 2024",
    images: ["gallery02.jpg", "gallery04.jpg", "gallery20.jpg"],
  },
  {
    title: "AU red rubber lined fittings for a titanium mine in Mozambique — Sept 2024",
    images: ["projectgallery17.jpg", "projectgallery18.jpg", "projectgallery19.jpg"],
  },
  {
    title: "AU red rubber lined fittings for a titanium mine in Mozambique — July 2024",
    images: ["gallery19.jpg", "projectgallery13.jpg", "projectgallery14.jpg"],
  },
  {
    title: "Rubber Lined Pipes and Chutes for a Titanium Mine in Mozambique — June 2022",
    images: ["projectgallery01.jpg", "projectgallery05.jpg", "projectgallery10.jpg"],
  },
  {
    title: "Rubber lined & HDPE pipes for copper mine in Limpopo — Sept 2021",
    images: ["gallery05.jpg", "gallery08.jpg", "projectgallery23.jpg"],
  },
];

function GalleryCard(props: { section: GallerySection }) {
  const imageCount = props.section.images.length;
  return (
    <div>
      <div className="bg-[#B8860B] text-white text-center py-4 px-4 uppercase font-bold text-sm tracking-wide leading-snug">
        {props.section.title}
      </div>
      <div className={`grid ${imageCount === 2 ? "grid-cols-2" : "grid-cols-3"} gap-0.5`}>
        {props.section.images.map((img) => (
          <div key={img} className="relative h-32 sm:h-36 md:h-40">
            <Image
              src={`/au-industries/gallery/${img}`}
              alt={props.section.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 200px"
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
      <section className="bg-[#B8860B] py-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider">
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
