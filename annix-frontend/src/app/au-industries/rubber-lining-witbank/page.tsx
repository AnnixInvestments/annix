import type { Metadata } from "next";
import { LocalLandingPage } from "../components/LocalLandingPage";

const SITE_URL = "https://auind.co.za";

export const metadata: Metadata = {
  title: "Rubber Lining Witbank (eMalahleni) — Mining & Coal",
  description:
    "Rubber lining services for Witbank, eMalahleni, and the Mpumalanga coal mining belt. AU Industries fabricates and lines from Boksburg with weekly delivery routes into Mpumalanga.",
  alternates: { canonical: `${SITE_URL}/rubber-lining-witbank` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/rubber-lining-witbank`,
    title: "Rubber Lining Witbank | AU Industries",
    description:
      "Rubber lining services for Witbank (eMalahleni) coal and platinum mining customers in Mpumalanga.",
  },
};

export default function RubberLiningWitbankPage() {
  return (
    <LocalLandingPage
      pathSlug="rubber-lining-witbank"
      serviceSlug="rubber-lining"
      serviceName="Rubber Lining"
      serviceDescription="We rubber line pipework, fittings, chutes, and wear panels for Witbank coal and Mpumalanga platinum customers. The 40 Black natural rubber compound is the workhorse for coal slurry abrasion; ceramic-embedded panels are specified for the most severe transfer-point and chute duties."
      suburb="Witbank (eMalahleni)"
      region="Mpumalanga"
      suburbContext="Witbank — officially eMalahleni — is the centre of South Africa's coal mining industry, with dozens of operating collieries and the coal-fired power station fleet of the Mpumalanga highveld. The region's coal slurries are highly abrasive on unlined steel, and our 40-shore natural rubber linings are a proven match for the duty. We run regular delivery routes from Boksburg into Witbank, Middelburg, and Hendrina."
      pageTitle="Rubber Lining Witbank"
      pageDescription="Rubber lining services for Witbank, eMalahleni, and the Mpumalanga coal and platinum mining belt. AU Industries fabricates and lines from Boksburg."
      caseStudyCountry="South Africa"
      heroImageSrc="/au-industries/gallery/gallery02.jpg"
      heroImageAlt="AU Red rubber lined pipe for Mpumalanga platinum mine"
    />
  );
}
