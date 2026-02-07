// Shared Products & Services Configuration
// Used by both RFQ form (page 1) and Supplier Onboarding

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
  hidden?: boolean;
}

// Master list of all products and services
// Adding new items here will automatically appear in:
// 1. RFQ form (page 1) - Products/Services selection
// 2. Supplier onboarding - Capabilities selection
export const PRODUCTS_AND_SERVICES: ProductService[] = [
  {
    value: "fabricated_steel",
    label: "Steel Pipes",
    description: "Fabricated steel pipes, bends, flanges, and fittings",
    icon: React.createElement(SteelPipeIcon, { size: 20 }),
    category: "product",
  },
  {
    value: "fasteners_gaskets",
    label: "Nuts, Bolts, Washers & Gaskets",
    description: "Fasteners, bolts, nuts, washers, gaskets, and sealing materials",
    icon: React.createElement(BoltNutIcon, { size: 20 }),
    category: "product",
  },
  {
    value: "surface_protection",
    label: "Surface Protection",
    description: "Coating, painting, galvanizing, and surface treatment services",
    icon: React.createElement(SurfaceProtectionIcon, { size: 20 }),
    category: "service",
  },
  {
    value: "hdpe",
    label: "HDPE Pipes",
    description: "High-density polyethylene pipes and fittings",
    icon: React.createElement(HdpePipeIcon, { size: 20 }),
    category: "product",
  },
  {
    value: "pvc",
    label: "PVC Pipes",
    description: "PVC pipes, fittings, and accessories",
    icon: React.createElement(PvcPipeIcon, { size: 20 }),
    category: "product",
  },
  {
    value: "structural_steel",
    label: "Structural Steel",
    description: "Structural steel fabrication and supply",
    icon: React.createElement(StructuralSteelIcon, { size: 20 }),
    category: "product",
    hidden: true,
  },
  {
    value: "pumps",
    label: "Pumps & Pump Parts",
    description: "Industrial pumps, spare parts, seals, impellers, and pump accessories",
    icon: React.createElement(IndustrialPumpIcon, { size: 20 }),
    category: "product",
  },
  {
    value: "valves_meters_instruments",
    label: "Valves, Meters & Instruments",
    description: "Industrial valves, flow meters, pressure gauges, and instrumentation",
    icon: React.createElement(IndustrialValveIcon, { size: 20 }),
    category: "product",
  },
  {
    value: "transport_install",
    label: "Transport/Install",
    description: "Transportation, delivery, and installation services",
    icon: "🚚",
    category: "service",
  },
  {
    value: "pipe_steel_work",
    label: "Pipe Brackets & Steel Work",
    description: "Pipe supports, brackets, compensation plates, and reinforcement pads",
    icon: "🔧",
    category: "product",
  },
];

// Helper to get visible products only
export const getProducts = (): ProductService[] =>
  PRODUCTS_AND_SERVICES.filter((item) => item.category === "product" && !item.hidden);

// Helper to get visible services only
export const getServices = (): ProductService[] =>
  PRODUCTS_AND_SERVICES.filter((item) => item.category === "service" && !item.hidden);

// Helper to get all visible items
export const getVisibleProductsAndServices = (): ProductService[] =>
  PRODUCTS_AND_SERVICES.filter((item) => !item.hidden);

// Helper to get item by value
export const getProductServiceByValue = (value: string): ProductService | undefined =>
  PRODUCTS_AND_SERVICES.find((item) => item.value === value);

// Helper to get labels for an array of values
export const getProductServiceLabels = (values: string[]): string[] =>
  values.map((v) => getProductServiceByValue(v)?.label || v);

// Unregistered customer restrictions
// Products/services available to unregistered customers (guests)
export const UNREGISTERED_ALLOWED_PRODUCTS = [
  "fabricated_steel", // Steel Pipes
  "fasteners_gaskets", // Nuts, Bolts, Washers & Gaskets
  "surface_protection", // Surface Protection
];

// RFQ types available to unregistered customers
export const UNREGISTERED_ALLOWED_PROJECT_TYPES = ["standard"];

// Check if a product/service is available to unregistered customers
export const isProductAvailableForUnregistered = (value: string): boolean =>
  UNREGISTERED_ALLOWED_PRODUCTS.includes(value);

// Check if a project type is available to unregistered customers
export const isProjectTypeAvailableForUnregistered = (value: string): boolean =>
  UNREGISTERED_ALLOWED_PROJECT_TYPES.includes(value);
