import React from "react";
import { BoltNutIcon } from "./icons/BoltNutIcon";
import { HdpePipeIcon, PvcPipeIcon, SteelPipeIcon } from "./icons/PipeIcon";
import { IndustrialPumpIcon } from "./icons/PumpIcon";
import { StructuralSteelIcon } from "./icons/StructuralSteelIcon";
import { SurfaceProtectionIcon } from "./icons/SurfaceProtectionIcon";
import { IndustrialValveIcon } from "./icons/ValveIcon";

export interface ProductService {
  value: string;
  label: string;
  description: string;
  icon: string | React.ReactNode;
  category: "product" | "service";
  flagKey: string;
}

export const PRODUCTS_AND_SERVICES: ProductService[] = [
  {
    value: "fabricated_steel",
    label: "Steel Pipes",
    description: "Fabricated steel pipes, bends, flanges, and fittings",
    icon: React.createElement(SteelPipeIcon, { size: 20 }),
    category: "product",
    flagKey: "RFQ_PRODUCT_FABRICATED_STEEL",
  },
  {
    value: "fasteners_gaskets",
    label: "Nuts, Bolts, Washers & Gaskets",
    description: "Fasteners, bolts, nuts, washers, gaskets, and sealing materials",
    icon: React.createElement(BoltNutIcon, { size: 20 }),
    category: "product",
    flagKey: "RFQ_PRODUCT_FASTENERS_GASKETS",
  },
  {
    value: "surface_protection",
    label: "Surface Protection",
    description: "Coating, painting, galvanizing, and surface treatment services",
    icon: React.createElement(SurfaceProtectionIcon, { size: 20 }),
    category: "service",
    flagKey: "RFQ_PRODUCT_SURFACE_PROTECTION",
  },
  {
    value: "hdpe",
    label: "HDPE Pipes",
    description: "High-density polyethylene pipes and fittings",
    icon: React.createElement(HdpePipeIcon, { size: 20 }),
    category: "product",
    flagKey: "RFQ_PRODUCT_HDPE",
  },
  {
    value: "pvc",
    label: "PVC Pipes",
    description: "PVC pipes, fittings, and accessories",
    icon: React.createElement(PvcPipeIcon, { size: 20 }),
    category: "product",
    flagKey: "RFQ_PRODUCT_PVC",
  },
  {
    value: "structural_steel",
    label: "Structural Steel",
    description: "Structural steel fabrication and supply",
    icon: React.createElement(StructuralSteelIcon, { size: 20 }),
    category: "product",
    flagKey: "RFQ_PRODUCT_STRUCTURAL_STEEL",
  },
  {
    value: "pumps",
    label: "Pumps & Pump Parts",
    description: "Industrial pumps, spare parts, seals, impellers, and pump accessories",
    icon: React.createElement(IndustrialPumpIcon, { size: 20 }),
    category: "product",
    flagKey: "RFQ_PRODUCT_PUMPS",
  },
  {
    value: "valves_meters_instruments",
    label: "Valves, Meters & Instruments",
    description: "Industrial valves, flow meters, pressure gauges, and instrumentation",
    icon: React.createElement(IndustrialValveIcon, { size: 20 }),
    category: "product",
    flagKey: "RFQ_PRODUCT_VALVES_METERS",
  },
  {
    value: "transport_install",
    label: "Transport/Install",
    description: "Transportation, delivery, and installation services",
    icon: "🚚",
    category: "service",
    flagKey: "RFQ_PRODUCT_TRANSPORT_INSTALL",
  },
  {
    value: "pipe_steel_work",
    label: "Pipe Brackets & Steel Work",
    description: "Pipe supports, brackets, compensation plates, and reinforcement pads",
    icon: "🔧",
    category: "product",
    flagKey: "RFQ_PRODUCT_PIPE_STEEL_WORK",
  },
];

export interface ProjectType {
  value: string;
  label: string;
  flagKey: string;
}

export const PROJECT_TYPES: ProjectType[] = [
  { value: "standard", label: "Standard RFQ", flagKey: "RFQ_TYPE_STANDARD" },
  { value: "phase1", label: "Phase 1 Tender", flagKey: "RFQ_TYPE_PHASE1" },
  { value: "retender", label: "Re-Tender", flagKey: "RFQ_TYPE_RETENDER" },
  { value: "feasibility", label: "Feasibility", flagKey: "RFQ_TYPE_FEASIBILITY" },
];

export const PROJECT_TYPE_FLAG_MAP: Record<string, string> = {
  standard: "RFQ_TYPE_STANDARD",
  phase1: "RFQ_TYPE_PHASE1",
  retender: "RFQ_TYPE_RETENDER",
  feasibility: "RFQ_TYPE_FEASIBILITY",
};

export const getProductServiceByValue = (value: string): ProductService | undefined =>
  PRODUCTS_AND_SERVICES.find((item) => item.value === value);

export const getProductServiceLabels = (values: string[]): string[] =>
  values.map((v) => getProductServiceByValue(v)?.label || v);

export const UNREGISTERED_ALLOWED_PRODUCTS = [
  "fabricated_steel",
  "fasteners_gaskets",
  "surface_protection",
];

export const UNREGISTERED_ALLOWED_PROJECT_TYPES = ["standard"];

export const isProductAvailableForUnregistered = (value: string): boolean =>
  UNREGISTERED_ALLOWED_PRODUCTS.includes(value);

export const isProjectTypeAvailableForUnregistered = (value: string): boolean =>
  UNREGISTERED_ALLOWED_PROJECT_TYPES.includes(value);
