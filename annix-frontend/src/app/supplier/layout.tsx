import type { Metadata } from "next";
import SupplierLayoutClient from "./SupplierLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Supplier",
    default: "Annix Supplier",
  },
  description: "Annix supplier portal for BOQ pricing",
};

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return <SupplierLayoutClient>{children}</SupplierLayoutClient>;
}
