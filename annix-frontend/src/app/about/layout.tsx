import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About Annix — One platform for industry",
  description:
    "Annix is a platform company building intelligent products for industry on one shared foundation.",
};

export default function AboutLayout(props: { children: ReactNode }) {
  const { children } = props;
  return children;
}
