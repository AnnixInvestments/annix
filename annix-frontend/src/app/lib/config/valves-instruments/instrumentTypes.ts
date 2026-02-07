// Valves, Meters & Instruments Module - Instrumentation Configuration
// Reference: ISA, IEC standards

export type InstrumentCategory = "flow" | "pressure" | "level" | "temperature" | "analytical";

export interface InstrumentType {
  value: string;
  label: string;
  description: string;
  category: InstrumentCategory;
  measurementPrinciple: string;
  icon: string;
  typicalApplications: string[];
  accuracyRange?: string;
}

// Flow Measurement Instruments
export const FLOW_INSTRUMENTS: InstrumentType[] = [
  {
    value: "mag_flowmeter",
    label: "Electromagnetic Flowmeter",
    description: "Uses Faraday's law for conductive fluids, no moving parts",
    category: "flow",
    measurementPrinciple: "Electromagnetic induction",
    icon: "🧲",
    typicalApplications: ["Water", "Wastewater", "Slurries", "Corrosives"],
    accuracyRange: "±0.2% to ±0.5%",
  },
  {
    value: "ultrasonic_flowmeter",
    label: "Ultrasonic Flowmeter",
    description: "Transit-time or Doppler measurement, clamp-on available",
    category: "flow",
    measurementPrinciple: "Sound wave propagation",
    icon: "🔊",
    typicalApplications: ["Clean liquids", "Non-conductive fluids", "Hydrocarbons"],
    accuracyRange: "±0.5% to ±1%",
  },
  {
    value: "coriolis_flowmeter",
    label: "Coriolis Flowmeter",
    description: "Mass flow measurement via tube vibration",
    category: "flow",
    measurementPrinciple: "Coriolis force",
    icon: "🌀",
    typicalApplications: ["Custody transfer", "Chemicals", "Batching"],
    accuracyRange: "±0.1% to ±0.2%",
  },
  {
    value: "turbine_flowmeter",
    label: "Turbine Flowmeter",
    description: "Rotor spins proportional to velocity",
    category: "flow",
    measurementPrinciple: "Mechanical rotation",
    icon: "🔄",
    typicalApplications: ["Clean liquids", "Fuels", "Custody transfer"],
    accuracyRange: "±0.5% to ±1%",
  },
  {
    value: "vortex_flowmeter",
    label: "Vortex Flowmeter",
    description: "Measures vortex shedding frequency",
    category: "flow",
    measurementPrinciple: "Vortex shedding",
    icon: "🌪️",
    typicalApplications: ["Steam", "Gas", "Clean liquids"],
    accuracyRange: "±0.75% to ±1%",
  },
  {
    value: "orifice_plate",
    label: "Orifice Plate",
    description: "Differential pressure across restriction",
    category: "flow",
    measurementPrinciple: "Differential pressure",
    icon: "⭕",
    typicalApplications: ["Gas", "Steam", "Liquid - all"],
    accuracyRange: "±1% to ±2%",
  },
  {
    value: "venturi_meter",
    label: "Venturi Meter",
    description: "Low pressure loss differential measurement",
    category: "flow",
    measurementPrinciple: "Differential pressure",
    icon: "📐",
    typicalApplications: ["Large pipes", "Dirty fluids", "Low pressure loss"],
    accuracyRange: "±0.5% to ±1%",
  },
  {
    value: "variable_area",
    label: "Variable Area (Rotameter)",
    description: "Float in tapered tube, visual indication",
    category: "flow",
    measurementPrinciple: "Mechanical displacement",
    icon: "📊",
    typicalApplications: ["Low flow", "Purge flows", "Visual indication"],
    accuracyRange: "±1% to ±2%",
  },
  {
    value: "paddle_wheel",
    label: "Paddle Wheel Flowmeter",
    description: "Insertion type, economical",
    category: "flow",
    measurementPrinciple: "Mechanical rotation",
    icon: "🏊",
    typicalApplications: ["Water", "Irrigation", "HVAC"],
    accuracyRange: "±1% to ±3%",
  },
];

// Pressure Measurement Instruments
export const PRESSURE_INSTRUMENTS: InstrumentType[] = [
  {
    value: "pressure_gauge",
    label: "Pressure Gauge (Bourdon)",
    description: "Mechanical gauge with bourdon tube element",
    category: "pressure",
    measurementPrinciple: "Mechanical deflection",
    icon: "⏱️",
    typicalApplications: ["Local indication", "General service"],
    accuracyRange: "±1% to ±2.5%",
  },
  {
    value: "pressure_transmitter",
    label: "Pressure Transmitter",
    description: "Electronic output (4-20mA) for remote monitoring",
    category: "pressure",
    measurementPrinciple: "Piezoresistive/Capacitive",
    icon: "📡",
    typicalApplications: ["Process control", "Remote monitoring", "SCADA"],
    accuracyRange: "±0.1% to ±0.5%",
  },
  {
    value: "dp_transmitter",
    label: "Differential Pressure Transmitter",
    description: "Measures pressure difference for flow/level",
    category: "pressure",
    measurementPrinciple: "Capacitive/Piezoresistive",
    icon: "📉",
    typicalApplications: ["Flow measurement", "Level", "Filter monitoring"],
    accuracyRange: "±0.04% to ±0.1%",
  },
  {
    value: "pressure_switch",
    label: "Pressure Switch",
    description: "On/off switching at setpoint",
    category: "pressure",
    measurementPrinciple: "Mechanical contact",
    icon: "🔘",
    typicalApplications: ["Alarms", "Safety shutdown", "Pump control"],
  },
  {
    value: "diaphragm_seal",
    label: "Diaphragm Seal",
    description: "Isolates transmitter from process",
    category: "pressure",
    measurementPrinciple: "Pressure transmission",
    icon: "🛡️",
    typicalApplications: ["Corrosive fluids", "High temperature", "Sanitary"],
  },
  {
    value: "vacuum_gauge",
    label: "Vacuum Gauge",
    description: "Measures pressure below atmospheric",
    category: "pressure",
    measurementPrinciple: "Various",
    icon: "🌑",
    typicalApplications: ["Vacuum systems", "Distillation", "Packaging"],
  },
];

// Level Measurement Instruments
export const LEVEL_INSTRUMENTS: InstrumentType[] = [
  {
    value: "radar_level",
    label: "Radar Level Transmitter",
    description: "Non-contact, electromagnetic waves, high accuracy",
    category: "level",
    measurementPrinciple: "Radar (FMCW/Pulse)",
    icon: "📡",
    typicalApplications: ["Harsh environments", "Dusty", "High temperature"],
    accuracyRange: "±2mm to ±5mm",
  },
  {
    value: "guided_wave_radar",
    label: "Guided Wave Radar (GWR)",
    description: "Probe-guided radar, works with interfaces",
    category: "level",
    measurementPrinciple: "TDR (Time Domain Reflectometry)",
    icon: "📶",
    typicalApplications: ["Interface level", "Small tanks", "Agitated"],
    accuracyRange: "±2mm to ±5mm",
  },
  {
    value: "ultrasonic_level",
    label: "Ultrasonic Level Transmitter",
    description: "Non-contact, sound waves, economical",
    category: "level",
    measurementPrinciple: "Sound wave reflection",
    icon: "🔊",
    typicalApplications: ["Open tanks", "Water/wastewater", "Bulk solids"],
    accuracyRange: "±0.25% to ±1%",
  },
  {
    value: "hydrostatic_level",
    label: "Hydrostatic Level Transmitter",
    description: "Measures liquid head pressure",
    category: "level",
    measurementPrinciple: "Pressure measurement",
    icon: "💧",
    typicalApplications: ["Open/closed tanks", "Wells", "Reservoirs"],
    accuracyRange: "±0.25% to ±0.5%",
  },
  {
    value: "float_level",
    label: "Float Level Switch",
    description: "Mechanical float actuates switch",
    category: "level",
    measurementPrinciple: "Buoyancy",
    icon: "🎈",
    typicalApplications: ["Point level", "Alarms", "Pump control"],
  },
  {
    value: "capacitance_level",
    label: "Capacitance Level Transmitter",
    description: "Change in capacitance with level",
    category: "level",
    measurementPrinciple: "Capacitance",
    icon: "⚡",
    typicalApplications: ["Solids", "Liquids", "Interface"],
  },
  {
    value: "magnetic_level",
    label: "Magnetic Level Gauge",
    description: "External indicator follows internal float",
    category: "level",
    measurementPrinciple: "Magnetic coupling",
    icon: "🧲",
    typicalApplications: ["Local indication", "Transmitter mounting"],
  },
  {
    value: "sight_glass",
    label: "Sight Glass / Level Gauge",
    description: "Visual level indication through glass",
    category: "level",
    measurementPrinciple: "Visual observation",
    icon: "👁️",
    typicalApplications: ["Local indication", "Boilers", "Tanks"],
  },
];

// Temperature Measurement Instruments
export const TEMPERATURE_INSTRUMENTS: InstrumentType[] = [
  {
    value: "rtd",
    label: "RTD (Resistance Temperature Detector)",
    description: "Platinum element, high accuracy, -200 to 500°C",
    category: "temperature",
    measurementPrinciple: "Electrical resistance",
    icon: "🌡️",
    typicalApplications: ["Process control", "High accuracy required"],
    accuracyRange: "±0.1°C to ±0.5°C",
  },
  {
    value: "thermocouple",
    label: "Thermocouple",
    description: "Two dissimilar metals, wide temperature range",
    category: "temperature",
    measurementPrinciple: "Seebeck effect",
    icon: "🔥",
    typicalApplications: ["High temperature", "Fast response", "Furnaces"],
    accuracyRange: "±1°C to ±2°C",
  },
  {
    value: "temp_transmitter",
    label: "Temperature Transmitter",
    description: "Converts sensor signal to 4-20mA",
    category: "temperature",
    measurementPrinciple: "Signal conversion",
    icon: "📡",
    typicalApplications: ["Remote monitoring", "SCADA integration"],
  },
  {
    value: "thermowell",
    label: "Thermowell",
    description: "Protective pocket for temperature sensors",
    category: "temperature",
    measurementPrinciple: "Mechanical protection",
    icon: "🛡️",
    typicalApplications: ["Process isolation", "Sensor protection"],
  },
  {
    value: "bimetal_thermometer",
    label: "Bimetal Thermometer",
    description: "Local indication, mechanical dial",
    category: "temperature",
    measurementPrinciple: "Thermal expansion",
    icon: "⏱️",
    typicalApplications: ["Local indication", "HVAC", "General service"],
    accuracyRange: "±1% to ±2%",
  },
  {
    value: "temp_switch",
    label: "Temperature Switch",
    description: "On/off switching at setpoint",
    category: "temperature",
    measurementPrinciple: "Bimetal/Bulb",
    icon: "🔘",
    typicalApplications: ["Alarms", "Safety shutdown", "HVAC"],
  },
  {
    value: "infrared_thermometer",
    label: "Infrared Temperature Sensor",
    description: "Non-contact measurement",
    category: "temperature",
    measurementPrinciple: "Infrared radiation",
    icon: "🔴",
    typicalApplications: ["Moving objects", "Hazardous areas", "High temperature"],
  },
];

// Analytical Instruments
export const ANALYTICAL_INSTRUMENTS: InstrumentType[] = [
  {
    value: "ph_analyzer",
    label: "pH Analyzer",
    description: "Measures acidity/alkalinity",
    category: "analytical",
    measurementPrinciple: "Electrochemical",
    icon: "🧪",
    typicalApplications: ["Water treatment", "Chemical process", "Environmental"],
  },
  {
    value: "conductivity_analyzer",
    label: "Conductivity Analyzer",
    description: "Measures electrical conductivity",
    category: "analytical",
    measurementPrinciple: "Electrical conductivity",
    icon: "⚡",
    typicalApplications: ["Water quality", "Concentration", "Purity"],
  },
  {
    value: "dissolved_oxygen",
    label: "Dissolved Oxygen Analyzer",
    description: "Measures O2 concentration in liquids",
    category: "analytical",
    measurementPrinciple: "Optical/Electrochemical",
    icon: "🫧",
    typicalApplications: ["Wastewater", "Aquaculture", "Fermentation"],
  },
  {
    value: "turbidity_analyzer",
    label: "Turbidity Analyzer",
    description: "Measures suspended solids/cloudiness",
    category: "analytical",
    measurementPrinciple: "Light scattering",
    icon: "🌫️",
    typicalApplications: ["Drinking water", "Wastewater", "Process"],
  },
  {
    value: "orp_analyzer",
    label: "ORP Analyzer",
    description: "Oxidation-Reduction Potential measurement",
    category: "analytical",
    measurementPrinciple: "Electrochemical",
    icon: "⚗️",
    typicalApplications: ["Disinfection", "Water treatment", "Swimming pools"],
  },
];

// Combine all instruments
export const ALL_INSTRUMENTS: InstrumentType[] = [
  ...FLOW_INSTRUMENTS,
  ...PRESSURE_INSTRUMENTS,
  ...LEVEL_INSTRUMENTS,
  ...TEMPERATURE_INSTRUMENTS,
  ...ANALYTICAL_INSTRUMENTS,
];

export const getInstrumentsByCategory = (category: InstrumentCategory): InstrumentType[] =>
  ALL_INSTRUMENTS.filter((inst) => inst.category === category);

export const getInstrumentByValue = (value: string): InstrumentType | undefined =>
  ALL_INSTRUMENTS.find((inst) => inst.value === value);
