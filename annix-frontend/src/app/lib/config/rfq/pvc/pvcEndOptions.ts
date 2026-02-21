export type PvcJoiningMethod = "solvent_cement" | "rubber_ring" | "threaded" | "flanged_adaptor";

export interface PvcJoiningOption {
  value: PvcJoiningMethod;
  label: string;
  description: string;
  requiresEquipment: boolean;
  suitableForSizes: { min: number; max: number };
}

export const PVC_JOINING_OPTIONS: PvcJoiningOption[] = [
  {
    value: "solvent_cement",
    label: "Solvent Cement",
    description: "Chemical welding using PVC solvent cement",
    requiresEquipment: false,
    suitableForSizes: { min: 20, max: 400 },
  },
  {
    value: "rubber_ring",
    label: "Rubber Ring Joint",
    description: "Push-fit connection with rubber seal ring",
    requiresEquipment: false,
    suitableForSizes: { min: 50, max: 630 },
  },
  {
    value: "threaded",
    label: "Threaded Connection",
    description: "BSP or NPT threaded connections",
    requiresEquipment: true,
    suitableForSizes: { min: 15, max: 100 },
  },
  {
    value: "flanged_adaptor",
    label: "Flanged Adaptor",
    description: "PVC flange stub with steel backing ring",
    requiresEquipment: false,
    suitableForSizes: { min: 50, max: 400 },
  },
];

export interface PvcPipeEndOption {
  value: string;
  label: string;
  joiningMethod: PvcJoiningMethod | null;
  description: string;
}

export const PVC_PIPE_END_OPTIONS: PvcPipeEndOption[] = [
  {
    value: "PE",
    label: "Plain End (Spigot)",
    joiningMethod: null,
    description: "Standard spigot end for socket connection",
  },
  {
    value: "SOCKET",
    label: "Socket End",
    joiningMethod: "solvent_cement",
    description: "Female socket for solvent cement jointing",
  },
  {
    value: "RRJ",
    label: "Rubber Ring Joint Socket",
    joiningMethod: "rubber_ring",
    description: "Socket with rubber ring groove",
  },
  {
    value: "THREADED",
    label: "Threaded End",
    joiningMethod: "threaded",
    description: "BSP or NPT threaded connection",
  },
  {
    value: "FLANGE",
    label: "Flanged End",
    joiningMethod: "flanged_adaptor",
    description: "PVC stub with backing flange",
  },
];

export const PVC_BEND_END_OPTIONS: PvcPipeEndOption[] = [
  {
    value: "SS",
    label: "Socket x Socket",
    joiningMethod: "solvent_cement",
    description: "Sockets both ends for solvent cement",
  },
  {
    value: "SP",
    label: "Socket x Spigot",
    joiningMethod: "solvent_cement",
    description: "Socket one end, spigot other",
  },
  {
    value: "RRJ_BOTH",
    label: "Rubber Ring Both Ends",
    joiningMethod: "rubber_ring",
    description: "Rubber ring sockets both ends",
  },
  {
    value: "FLANGE_BOTH",
    label: "Flanged Both Ends",
    joiningMethod: "flanged_adaptor",
    description: "Flanged adaptors both ends",
  },
];

export const PVC_FITTING_END_OPTIONS: PvcPipeEndOption[] = [
  {
    value: "SS",
    label: "Socket All Ports",
    joiningMethod: "solvent_cement",
    description: "Solvent cement sockets on all ports",
  },
  {
    value: "RRJ_ALL",
    label: "Rubber Ring All Ports",
    joiningMethod: "rubber_ring",
    description: "Rubber ring joints on all ports",
  },
  {
    value: "FLANGE_ALL",
    label: "Flanged All Ports",
    joiningMethod: "flanged_adaptor",
    description: "Flanged connections on all ports",
  },
  {
    value: "THREADED_ALL",
    label: "Threaded All Ports",
    joiningMethod: "threaded",
    description: "Threaded connections on all ports",
  },
];

export const pvcJoiningOptionByValue = (value: PvcJoiningMethod): PvcJoiningOption | null =>
  PVC_JOINING_OPTIONS.find((o) => o.value === value) ?? null;

export const suitablePvcJoiningMethodsForSize = (outsideDiameterMm: number): PvcJoiningOption[] =>
  PVC_JOINING_OPTIONS.filter(
    (opt) =>
      outsideDiameterMm >= opt.suitableForSizes.min &&
      outsideDiameterMm <= opt.suitableForSizes.max,
  );
