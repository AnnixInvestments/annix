import type { Metadata } from "next";
import CustomerLayoutClient from "./CustomerLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Forge",
    default: "Annix Forge",
  },
  description: "Annix Forge customer portal — quote, build, inspect, deliver",
};

export default function CustomerLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <CustomerLayoutClient>{children}</CustomerLayoutClient>;
}
