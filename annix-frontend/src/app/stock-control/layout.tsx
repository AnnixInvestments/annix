import type { Metadata } from "next";
import StockControlLayoutClient from "./StockControlLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Stock Control",
    default: "Annix Stock Control",
  },
  description: "Annix stock control and inventory management",
};

export default function StockControlLayout({ children }: { children: React.ReactNode }) {
  return <StockControlLayoutClient>{children}</StockControlLayoutClient>;
}
