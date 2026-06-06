import type { Metadata } from "next";
import SupplierLayoutClient from "./SupplierLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Forge",
    default: "Annix Forge",
  },
  description: "Annix Forge supplier portal — BOQ pricing",
};

export default function SupplierLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <SupplierLayoutClient>{children}</SupplierLayoutClient>;
}
