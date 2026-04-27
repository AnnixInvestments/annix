import type { Metadata } from "next";
import { LocalLandingPage } from "../components/LocalLandingPage";

const SITE_URL = "https://auind.co.za";

export const metadata: Metadata = {
  title: "Rubber Lining Boksburg — On-Site Fabrication & Lining",
  description:
    "Local rubber lining services for Boksburg mining and industrial customers. AU Industries is based in Dunswart, Boksburg with same-day quoting and fast turnaround across the East Rand.",
  alternates: { canonical: `${SITE_URL}/rubber-lining-boksburg` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/rubber-lining-boksburg`,
    title: "Rubber Lining Boksburg | AU Industries",
    description:
      "Local rubber lining services for Boksburg and East Rand mining and industrial customers.",
  },
};

export default function RubberLiningBoksburgPage() {
  return (
    <LocalLandingPage
      pathSlug="rubber-lining-boksburg"
      serviceSlug="rubber-lining"
      serviceName="Rubber Lining"
      serviceDescription="We rubber line pipes, fittings, chutes, hoppers, tanks, and wear components in our 40 Black, 40 Red, 60 Shore, and A38 premium compounds — autoclave cured and inspected before dispatch. Lining thickness is specified to match the slurry abrasion profile, with custom compounds available where catalogue compounds don't fit."
      suburb="Boksburg"
      region="East Rand, Gauteng"
      suburbContext="AU Industries operates from a fabrication facility in Dunswart, Boksburg — the heart of the East Rand industrial belt. The location lets us collect, line, and return work to nearby Boksburg, Benoni, Brakpan, Springs, and Germiston customers within tight schedules, and serve the broader Witwatersrand mining and processing belt with short transit times."
      pageTitle="Rubber Lining Boksburg"
      pageDescription="Local rubber lining services for Boksburg mining and industrial customers. AU Industries operates from Dunswart, Boksburg with same-day quoting and fast turnaround across the East Rand."
      caseStudyCountry="South Africa"
      heroImageSrc="/au-industries/gallery/gallery02.jpg"
      heroImageAlt="AU Red 40 shore rubber lined pipe at AU Industries Boksburg facility"
    />
  );
}
