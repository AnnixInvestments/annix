import type { Metadata } from "next";
import { LocalLandingPage } from "../components/LocalLandingPage";

const SITE_URL = "https://auind.co.za";

export const metadata: Metadata = {
  title: "Rubber Lining Benoni — East Rand Mining & Industrial",
  description:
    "Rubber lining services for Benoni and East Rand mining and industrial customers. AU Industries fabricates and lines from neighbouring Boksburg with same-day collection and delivery.",
  alternates: { canonical: `${SITE_URL}/rubber-lining-benoni` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/rubber-lining-benoni`,
    images: [
      {
        url: `${SITE_URL}/au-industries/gallery/gallery02.jpg`,
        alt: "Rubber lining services in Benoni — AU Industries",
      },
    ],
    title: "Rubber Lining Benoni | AU Industries",
    description:
      "Rubber lining services for Benoni and East Rand mining and industrial customers from our neighbouring Boksburg facility.",
  },
};

export default function RubberLiningBenoniPage() {
  return (
    <LocalLandingPage
      pathSlug="rubber-lining-benoni"
      serviceSlug="rubber-lining"
      serviceName="Rubber Lining"
      serviceDescription="We rubber line pipes, fittings, chutes, hoppers, tanks, and wear components in our 40 Black, 40 Red, 60 Shore, and A38 premium compounds — autoclave cured and inspected before dispatch. Lining thickness is matched to the slurry abrasion profile, with custom compounds developed where catalogue compounds don't fit."
      suburb="Benoni"
      region="East Rand, Gauteng"
      suburbContext="Benoni sits on the East Rand gold belt next door to our Anderbolt, Boksburg facility — a few minutes' drive away. That proximity lets us collect, line, and return pipework and fittings to Benoni mining, processing, and general-industrial customers inside tight schedules, and offer quick site visits for tank, chute, and pulley-lagging surveys across the Apex, Actonville, and Benoni South industrial areas."
      pageTitle="Rubber Lining Benoni"
      pageDescription="Rubber lining services for Benoni and East Rand mining and industrial customers. AU Industries fabricates and lines from neighbouring Boksburg with same-day turnaround."
      caseStudyCountry="South Africa"
      heroImageSrc="/au-industries/gallery/gallery04.jpg"
      heroImageAlt="AU rubber lined pipe and fittings for Benoni East Rand customer"
    />
  );
}
