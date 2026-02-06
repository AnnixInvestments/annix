// Valves, Meters & Instruments Module - Main Export
// Standalone module for valve and instrumentation RFQ specifications and pricing

export * from './valveTypes';
export * from './valveSpecifications';
export * from './instrumentTypes';
export * from './references';

// Module metadata
export const VALVES_INSTRUMENTS_MODULE = {
  name: 'Valves, Meters & Instruments',
  value: 'valves_meters_instruments',
  version: '1.0.0',
  description: 'Industrial valves, flow meters, pressure gauges, and instrumentation',
  icon: '🎛️',
  categories: [
    { value: 'isolation_valve', label: 'Isolation Valves', description: 'Ball, gate, butterfly, plug valves' },
    { value: 'control_valve', label: 'Control Valves', description: 'Globe, ball, butterfly control valves' },
    { value: 'check_valve', label: 'Check Valves', description: 'Swing, dual plate, lift check valves' },
    { value: 'safety_valve', label: 'Safety Valves', description: 'Relief valves, rupture discs' },
    { value: 'flow_meter', label: 'Flow Meters', description: 'Electromagnetic, ultrasonic, coriolis meters' },
    { value: 'pressure_instrument', label: 'Pressure Instruments', description: 'Gauges, transmitters, switches' },
    { value: 'level_instrument', label: 'Level Instruments', description: 'Radar, ultrasonic, hydrostatic' },
    { value: 'temperature_instrument', label: 'Temperature Instruments', description: 'RTD, thermocouple, transmitters' },
    { value: 'analytical_instrument', label: 'Analytical Instruments', description: 'pH, conductivity, dissolved oxygen' },
    { value: 'actuator', label: 'Actuators & Accessories', description: 'Pneumatic, electric, hydraulic actuators' },
  ],
};
