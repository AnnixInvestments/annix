import type { Metadata } from "next";
import CustomerLayoutClient from "./CustomerLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Customer",
    default: "Annix Customer",
  },
  description: "Annix customer portal for RFQ management",
};

export default function CustomerLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <CustomerLayoutClient>{children}</CustomerLayoutClient>;
}
