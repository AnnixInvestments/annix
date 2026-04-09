import type { Metadata } from "next";
import { AuIndustriesLayoutClient } from "./AuIndustriesLayoutClient";

export const metadata: Metadata = {
  title: {
    default: "AU Industries - Rubber Lining, Sheeting & Industrial Solutions",
    template: "%s | AU Industries",
  },
  description:
    "AU Industries specialises in rubber lining, rubber sheeting, HDPE lining, and industrial rubber solutions for mining, chemical processing, and water treatment in South Africa.",
};

export default function AuIndustriesLayout(props: { children: React.ReactNode }) {
  return <AuIndustriesLayoutClient>{props.children}</AuIndustriesLayoutClient>;
}
