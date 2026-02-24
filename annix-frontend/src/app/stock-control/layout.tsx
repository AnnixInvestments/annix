import type { Metadata, Viewport } from "next";
import StockControlLayoutClient from "./StockControlLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Stock Control",
    default: "Annix Stock Control",
  },
  description: "Annix stock control and inventory management",
  manifest: "/stock-control-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stock Control",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function StockControlLayout({ children }: { children: React.ReactNode }) {
  return <StockControlLayoutClient>{children}</StockControlLayoutClient>;
}
