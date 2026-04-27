import type { Metadata } from "next";
import { LocalLandingPage } from "../components/LocalLandingPage";

const SITE_URL = "https://auind.co.za";

export const metadata: Metadata = {
  title: "Rubber Lining Johannesburg — Mining & Industrial",
  description:
    "Rubber lining services for Johannesburg mining, processing, and industrial customers. AU Industries fabricates and lines from Boksburg with fast collection and delivery across the Witwatersrand.",
  alternates: { canonical: `${SITE_URL}/rubber-lining-johannesburg` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/rubber-lining-johannesburg`,
    title: "Rubber Lining Johannesburg | AU Industries",
    description:
      "Rubber lining services for Johannesburg mining and industrial customers from our Boksburg facility.",
  },
};

export default function RubberLiningJohannesburgPage() {
  return (
    <LocalLandingPage
      pathSlug="rubber-lining-johannesburg"
      serviceSlug="rubber-lining"
      serviceName="Rubber Lining"
      serviceDescription="We rubber line pipes, fittings, chutes, hoppers, and wear components for Johannesburg mining and processing customers. Standard compounds (40 Black, 40 Red, 60 Shore) cover most slurry duties, with ceramic-embedded panels for severe-wear chute and transfer-point service."
      suburb="Johannesburg"
      region="Greater Johannesburg, Gauteng"
      suburbContext="Johannesburg sits at the heart of the Witwatersrand mining belt, with deep-level gold and platinum operations on its periphery and a dense industrial corridor through Roodepoort, Krugersdorp, Carletonville, and Randfontein. From our Boksburg facility we can run pipework and lined fittings to Johannesburg sites the same day, and offer site visits for tank, chute, and pulley lagging surveys."
      pageTitle="Rubber Lining Johannesburg"
      pageDescription="Rubber lining services for Johannesburg mining, processing, and industrial customers. AU Industries fabricates and lines from Boksburg with fast collection and delivery."
      caseStudyCountry="South Africa"
      heroImageSrc="/au-industries/gallery/gallery41.jpg"
      heroImageAlt="AU 40 Black rubber lined pipe ready for Johannesburg mining customer"
    />
  );
}
