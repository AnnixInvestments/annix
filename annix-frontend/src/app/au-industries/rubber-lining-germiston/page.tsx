import type { Metadata } from "next";
import { LocalLandingPage } from "../components/LocalLandingPage";

const SITE_URL = "https://auind.co.za";

export const metadata: Metadata = {
  title: "Rubber Lining Germiston — East Rand Industrial & Mining",
  description:
    "Rubber lining services for Germiston and East Rand industrial and mining customers. AU Industries fabricates and lines from nearby Boksburg with same-day collection and delivery across Gauteng.",
  alternates: { canonical: `${SITE_URL}/rubber-lining-germiston` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/rubber-lining-germiston`,
    images: [
      {
        url: `${SITE_URL}/au-industries/gallery/gallery02.jpg`,
        alt: "Rubber lining services in Germiston — AU Industries",
      },
    ],
    title: "Rubber Lining Germiston | AU Industries",
    description:
      "Rubber lining services for Germiston and East Rand industrial and mining customers from our nearby Boksburg facility.",
  },
};

export default function RubberLiningGermistonPage() {
  return (
    <LocalLandingPage
      pathSlug="rubber-lining-germiston"
      serviceSlug="rubber-lining"
      serviceName="Rubber Lining"
      serviceDescription="We rubber line pipes, fittings, chutes, hoppers, tanks, and wear components in our 40 Black, 40 Red, 60 Shore, and A38 premium compounds — autoclave cured and inspected before dispatch. Lining thickness is matched to the slurry abrasion profile, with custom compounds developed where catalogue compounds don't fit."
      suburb="Germiston"
      region="East Rand, Gauteng"
      suburbContext="Germiston is one of South Africa's densest industrial hubs, on the East Rand corridor between our Boksburg facility and Johannesburg. From Anderbolt we can run lined pipework and fittings to Germiston engineering, refining, and processing customers the same day, and reach the surrounding Wadeville, Knights, and Elandsfontein industrial areas with short transit times for collection, lining, and return."
      pageTitle="Rubber Lining Germiston"
      pageDescription="Rubber lining services for Germiston and East Rand industrial and mining customers. AU Industries fabricates and lines from nearby Boksburg with same-day turnaround."
      caseStudyCountry="South Africa"
      heroImageSrc="/au-industries/gallery/gallery08.jpg"
      heroImageAlt="AU rubber lined pipework for Germiston East Rand industrial customer"
    />
  );
}
