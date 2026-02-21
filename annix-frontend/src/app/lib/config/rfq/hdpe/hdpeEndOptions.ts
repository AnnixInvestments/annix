export type HdpeJoiningMethod = "butt_fusion" | "electrofusion" | "mechanical" | "flanged_adaptor";

export interface HdpeJoiningOption {
  value: HdpeJoiningMethod;
  label: string;
  description: string;
  requiresEquipment: boolean;
  suitableForSizes: { min: number; max: number };
}

export const HDPE_JOINING_OPTIONS: HdpeJoiningOption[] = [
  {
    value: "butt_fusion",
    label: "Butt Fusion",
    description: "Heat-welded joint using butt fusion machine",
    requiresEquipment: true,
    suitableForSizes: { min: 63, max: 1000 },
  },
  {
    value: "electrofusion",
    label: "Electrofusion",
    description: "Welded using electrofusion fittings with embedded heating element",
    requiresEquipment: true,
    suitableForSizes: { min: 20, max: 630 },
  },
  {
    value: "mechanical",
    label: "Mechanical Coupling",
    description: "Compression fittings or mechanical couplers",
    requiresEquipment: false,
    suitableForSizes: { min: 20, max: 315 },
  },
  {
    value: "flanged_adaptor",
    label: "Flanged Adaptor",
    description: "Stub end with loose backing flange for connection to steel",
    requiresEquipment: true,
    suitableForSizes: { min: 50, max: 630 },
  },
];

export interface HdpePipeEndOption {
  value: string;
  label: string;
  joiningMethod: HdpeJoiningMethod | null;
  description: string;
}

export const HDPE_PIPE_END_OPTIONS: HdpePipeEndOption[] = [
  {
    value: "PE",
    label: "Plain End",
    joiningMethod: null,
    description: "Standard pipe end for butt fusion or electrofusion",
  },
  {
    value: "SPIGOT",
    label: "Spigot End",
    joiningMethod: "electrofusion",
    description: "Machined spigot for electrofusion socket fittings",
  },
  {
    value: "SOCKET_EF",
    label: "Electrofusion Socket",
    joiningMethod: "electrofusion",
    description: "Pre-installed electrofusion socket",
  },
  {
    value: "STUB_FLANGE",
    label: "Stub End + Backing Flange",
    joiningMethod: "flanged_adaptor",
    description: "HDPE stub welded to pipe with steel backing flange",
  },
  {
    value: "MECH_COUPLING",
    label: "Mechanical Coupling End",
    joiningMethod: "mechanical",
    description: "End prepared for mechanical coupling connection",
  },
];

export const HDPE_BEND_END_OPTIONS: HdpePipeEndOption[] = [
  {
    value: "PE",
    label: "Plain End Both Sides",
    joiningMethod: null,
    description: "Fabricated bend with plain ends for butt fusion",
  },
  {
    value: "STUB_ONE",
    label: "Stub Flange One End",
    joiningMethod: "flanged_adaptor",
    description: "One end with stub flange, other plain",
  },
  {
    value: "STUB_BOTH",
    label: "Stub Flange Both Ends",
    joiningMethod: "flanged_adaptor",
    description: "Both ends with stub flanges",
  },
];

export const HDPE_FITTING_END_OPTIONS: HdpePipeEndOption[] = [
  {
    value: "PE",
    label: "Plain End All Ports",
    joiningMethod: null,
    description: "All ports plain ended for butt fusion",
  },
  {
    value: "EF_ALL",
    label: "Electrofusion All Ports",
    joiningMethod: "electrofusion",
    description: "All ports with electrofusion sockets",
  },
  {
    value: "STUB_ALL",
    label: "Stub Flange All Ports",
    joiningMethod: "flanged_adaptor",
    description: "All ports with stub flanges",
  },
  {
    value: "MIXED",
    label: "Mixed Configuration",
    joiningMethod: null,
    description: "Custom combination of connection types",
  },
];

export const hdpeJoiningOptionByValue = (value: HdpeJoiningMethod): HdpeJoiningOption | null =>
  HDPE_JOINING_OPTIONS.find((o) => o.value === value) ?? null;

export const suitableJoiningMethodsForSize = (outsideDiameterMm: number): HdpeJoiningOption[] =>
  HDPE_JOINING_OPTIONS.filter(
    (opt) =>
      outsideDiameterMm >= opt.suitableForSizes.min &&
      outsideDiameterMm <= opt.suitableForSizes.max,
  );
