// Valves, Meters & Instruments Module - Instrument Specifications
// Used for RFQ forms and pricing calculations

// Communication Protocol Options
export const COMMUNICATION_PROTOCOL_OPTIONS = [
  { value: "4_20ma", label: "4-20mA Analog", description: "Standard analog current loop output" },
  {
    value: "4_20ma_hart",
    label: "4-20mA with HART",
    description: "Analog with digital HART protocol overlay",
  },
  {
    value: "hart_7",
    label: "HART 7",
    description: "Highway Addressable Remote Transducer protocol",
  },
  {
    value: "profibus_pa",
    label: "PROFIBUS PA",
    description: "Process Automation fieldbus, 31.25 kbit/s",
  },
  {
    value: "profibus_dp",
    label: "PROFIBUS DP",
    description: "Decentralized Periphery, up to 12 Mbit/s",
  },
  {
    value: "foundation_fieldbus",
    label: "Foundation Fieldbus H1",
    description: "ISA/IEC 61158 fieldbus, 31.25 kbit/s",
  },
  { value: "modbus_rtu", label: "Modbus RTU", description: "Serial RS-485 Modbus protocol" },
  { value: "modbus_tcp", label: "Modbus TCP/IP", description: "Modbus over Ethernet TCP/IP" },
  {
    value: "ethernet_ip",
    label: "EtherNet/IP",
    description: "Industrial Ethernet protocol (Rockwell/ODVA)",
  },
  { value: "profinet", label: "PROFINET", description: "Industrial Ethernet by Siemens/PI" },
  { value: "io_link", label: "IO-Link", description: "Point-to-point sensor communication" },
  {
    value: "wireless_hart",
    label: "WirelessHART",
    description: "IEC 62591 wireless mesh protocol",
  },
  { value: "isa_100", label: "ISA100.11a", description: "Industrial wireless standard" },
  { value: "bluetooth", label: "Bluetooth", description: "For configuration and diagnostics" },
  {
    value: "pulse_frequency",
    label: "Pulse/Frequency Output",
    description: "Digital pulse or frequency output",
  },
  { value: "relay_contact", label: "Relay Contact", description: "Dry contact relay output" },
];

// Display Options
export const DISPLAY_OPTIONS = [
  {
    value: "none",
    label: "Blind (No Display)",
    description: "No local display, remote indication only",
  },
  { value: "local_analog", label: "Local Analog", description: "Analog pointer/gauge display" },
  { value: "local_lcd", label: "Local LCD", description: "LCD display on transmitter" },
  { value: "local_led", label: "Local LED", description: "LED digital display" },
  { value: "local_oled", label: "Local OLED", description: "OLED display with graphics" },
  {
    value: "remote_indicator",
    label: "Remote Indicator",
    description: "Separate remote display unit",
  },
  { value: "touchscreen", label: "Touchscreen", description: "Local touchscreen interface" },
  {
    value: "backlit",
    label: "Backlit Display",
    description: "Illuminated for low-light conditions",
  },
  {
    value: "rotatable",
    label: "Rotatable Display",
    description: "Display can be rotated for viewing angle",
  },
];

// Power Supply Options
export const POWER_SUPPLY_OPTIONS = [
  {
    value: "loop_powered",
    label: "Loop Powered (2-wire)",
    description: "4-20mA loop powered, typically 12-42V DC",
  },
  { value: "24vdc_4wire", label: "24V DC (4-wire)", description: "External 24V DC power supply" },
  { value: "12vdc", label: "12V DC", description: "External 12V DC power supply" },
  { value: "110vac", label: "110V AC", description: "110V AC mains power" },
  { value: "220vac", label: "220/240V AC", description: "220-240V AC mains power" },
  { value: "380vac", label: "380/400V AC", description: "380-400V AC three-phase" },
  { value: "battery", label: "Battery Powered", description: "Internal battery (specify type)" },
  { value: "solar", label: "Solar Powered", description: "Solar panel with battery backup" },
  {
    value: "intrinsic_safe",
    label: "Intrinsically Safe Supply",
    description: "IS barrier powered for hazardous areas",
  },
];

// Wetted Parts Material Options
export const WETTED_PARTS_MATERIAL_OPTIONS = [
  {
    value: "ss_316",
    label: "Stainless Steel 316/316L",
    description: "Standard for most applications",
  },
  {
    value: "ss_304",
    label: "Stainless Steel 304",
    description: "Economical option for non-corrosive",
  },
  {
    value: "hastelloy_c",
    label: "Hastelloy C-276",
    description: "Highly corrosion resistant alloy",
  },
  { value: "monel", label: "Monel 400", description: "Nickel-copper alloy, seawater resistant" },
  {
    value: "titanium",
    label: "Titanium",
    description: "Excellent corrosion resistance, lightweight",
  },
  { value: "tantalum", label: "Tantalum", description: "Extreme corrosion resistance" },
  { value: "ceramic", label: "Ceramic (Al2O3)", description: "Abrasion resistant" },
  { value: "ptfe", label: "PTFE Lined", description: "Chemically inert lining" },
  { value: "pfa", label: "PFA Lined", description: "Perfluoroalkoxy fluoropolymer" },
  { value: "pvdf", label: "PVDF", description: "Polyvinylidene fluoride" },
  {
    value: "ruby",
    label: "Synthetic Ruby/Sapphire",
    description: "For precision bearing surfaces",
  },
  { value: "tungsten_carbide", label: "Tungsten Carbide", description: "Extreme wear resistance" },
];

// Process Connection Types
export const PROCESS_CONNECTION_OPTIONS = [
  { value: "flanged_asme", label: "Flanged ASME", description: "ASME B16.5 flanged connection" },
  {
    value: "flanged_din",
    label: "Flanged DIN/EN",
    description: "DIN/EN 1092-1 flanged connection",
  },
  {
    value: "flanged_jis",
    label: "Flanged JIS",
    description: "Japanese Industrial Standard flange",
  },
  { value: "threaded_npt", label: "Threaded NPT", description: "National Pipe Tapered thread" },
  { value: "threaded_bsp", label: "Threaded BSP", description: "British Standard Pipe thread" },
  { value: "threaded_metric", label: "Threaded Metric", description: "ISO metric thread" },
  { value: "tri_clamp", label: "Tri-Clamp (Sanitary)", description: "Sanitary clamp connection" },
  { value: "din_11851", label: "DIN 11851 (Dairy)", description: "Hygienic threaded connection" },
  { value: "sms_1145", label: "SMS 1145", description: "Swedish sanitary standard" },
  { value: "wafer", label: "Wafer", description: "Between flanges installation" },
  {
    value: "insertion",
    label: "Insertion/Hot Tap",
    description: "Insertion style with ball valve",
  },
  { value: "clamp_on", label: "Clamp-On", description: "Non-intrusive, external mounting" },
  { value: "threaded_socket", label: "Threaded Socket", description: "Female socket thread" },
  {
    value: "compression",
    label: "Compression Fitting",
    description: "Tube compression connection",
  },
  { value: "vco", label: "VCO/VCR Fitting", description: "Metal seal face fitting" },
];

// Cable Entry / Conduit Options
export const CABLE_ENTRY_OPTIONS = [
  { value: "m20", label: "M20 x 1.5", description: "Metric M20 cable gland" },
  { value: "m25", label: "M25 x 1.5", description: "Metric M25 cable gland" },
  { value: "npt_half", label: '½" NPT', description: "Half inch NPT conduit" },
  { value: "npt_three_quarter", label: '¾" NPT', description: "Three-quarter inch NPT conduit" },
  { value: "g_half", label: 'G ½" BSP', description: "Half inch BSP conduit" },
  { value: "g_three_quarter", label: 'G ¾" BSP', description: "Three-quarter inch BSP conduit" },
  { value: "pg_13", label: "PG 13.5", description: "German PG thread standard" },
  { value: "pg_16", label: "PG 16", description: "German PG thread standard" },
  { value: "terminal_block", label: "Terminal Block", description: "Screw terminal connection" },
  {
    value: "connector_m12",
    label: "M12 Connector",
    description: "Industrial M12 circular connector",
  },
  { value: "connector_7_8", label: '7/8" Connector', description: '7/8" industrial connector' },
  { value: "connector_han", label: "Harting HAN", description: "Harting industrial connector" },
];

// Explosion-Proof Enclosure Options
export const EXPLOSION_PROOF_OPTIONS = [
  { value: "none", label: "General Purpose", description: "Non-hazardous area (safe area)" },
  { value: "ex_d", label: "Ex d (Flameproof)", description: "Flameproof enclosure, IEC 60079-1" },
  { value: "ex_e", label: "Ex e (Increased Safety)", description: "Increased safety, IEC 60079-7" },
  {
    value: "ex_ia",
    label: "Ex ia (Intrinsically Safe)",
    description: "IS for Zone 0, IEC 60079-11",
  },
  {
    value: "ex_ib",
    label: "Ex ib (Intrinsically Safe)",
    description: "IS for Zone 1, IEC 60079-11",
  },
  {
    value: "ex_ic",
    label: "Ex ic (Intrinsically Safe)",
    description: "IS for Zone 2, IEC 60079-11",
  },
  { value: "ex_n", label: "Ex n (Non-Sparking)", description: "Type n for Zone 2, IEC 60079-15" },
  { value: "ex_p", label: "Ex p (Pressurized)", description: "Pressurized enclosure, IEC 60079-2" },
  { value: "ex_m", label: "Ex m (Encapsulation)", description: "Encapsulated, IEC 60079-18" },
  {
    value: "ex_t",
    label: "Ex t (Dust)",
    description: "Protection by enclosure for dust, IEC 60079-31",
  },
  { value: "atex_zone_0", label: "ATEX Zone 0", description: "Gas continuously present" },
  { value: "atex_zone_1", label: "ATEX Zone 1", description: "Gas likely during normal operation" },
  {
    value: "atex_zone_2",
    label: "ATEX Zone 2",
    description: "Gas not likely, only abnormal conditions",
  },
  {
    value: "atex_zone_20",
    label: "ATEX Zone 20",
    description: "Combustible dust continuously present",
  },
  {
    value: "atex_zone_21",
    label: "ATEX Zone 21",
    description: "Combustible dust likely during normal operation",
  },
  {
    value: "atex_zone_22",
    label: "ATEX Zone 22",
    description: "Combustible dust not likely, abnormal only",
  },
  {
    value: "class_i_div_1",
    label: "Class I Div 1 (NEC)",
    description: "US/Canada hazardous gas normally present",
  },
  {
    value: "class_i_div_2",
    label: "Class I Div 2 (NEC)",
    description: "US/Canada hazardous gas abnormal only",
  },
  {
    value: "class_ii_div_1",
    label: "Class II Div 1 (NEC)",
    description: "US/Canada combustible dust normally present",
  },
  {
    value: "class_ii_div_2",
    label: "Class II Div 2 (NEC)",
    description: "US/Canada combustible dust abnormal only",
  },
];

// IP Protection Rating
export const IP_RATING_OPTIONS = [
  { value: "ip65", label: "IP65", description: "Dust-tight, water jets protected" },
  { value: "ip66", label: "IP66", description: "Dust-tight, powerful water jets protected" },
  { value: "ip67", label: "IP67", description: "Dust-tight, temporary immersion protected" },
  { value: "ip68", label: "IP68", description: "Dust-tight, continuous immersion protected" },
  { value: "ip69k", label: "IP69K", description: "Dust-tight, high-pressure/steam cleaning" },
];

// Instrument Output Signal Options
export const OUTPUT_SIGNAL_OPTIONS = [
  { value: "4_20ma", label: "4-20mA", description: "Standard analog current output" },
  { value: "0_20ma", label: "0-20mA", description: "Alternative analog current output" },
  { value: "1_5v", label: "1-5V DC", description: "Voltage output" },
  { value: "0_10v", label: "0-10V DC", description: "Voltage output" },
  { value: "0_5v", label: "0-5V DC", description: "Voltage output" },
  { value: "pulse", label: "Pulse Output", description: "Frequency/pulse proportional to flow" },
  {
    value: "frequency",
    label: "Frequency Output",
    description: "Frequency proportional to measurement",
  },
  { value: "switch_spdt", label: "Switch SPDT", description: "Single pole double throw relay" },
  { value: "switch_dpdt", label: "Switch DPDT", description: "Double pole double throw relay" },
  { value: "namur", label: "NAMUR", description: "Intrinsically safe proximity switch" },
  {
    value: "digital_bus",
    label: "Digital Fieldbus",
    description: "Protocol-specific digital output",
  },
];

// Accuracy Classes
export const ACCURACY_CLASS_OPTIONS = [
  { value: "class_0_1", label: "±0.1%", description: "High accuracy, custody transfer" },
  { value: "class_0_2", label: "±0.2%", description: "High accuracy" },
  { value: "class_0_25", label: "±0.25%", description: "Process measurement" },
  { value: "class_0_5", label: "±0.5%", description: "Standard process" },
  { value: "class_1_0", label: "±1.0%", description: "General purpose" },
  { value: "class_1_5", label: "±1.5%", description: "Indication only" },
  { value: "class_2_5", label: "±2.5%", description: "Rough indication" },
];

// Calibration Certificate Options
export const CALIBRATION_OPTIONS = [
  {
    value: "standard",
    label: "Standard Factory Calibration",
    description: "Manufacturer standard calibration",
  },
  {
    value: "traceable",
    label: "Traceable Calibration",
    description: "Calibration traceable to national standards",
  },
  { value: "nist", label: "NIST Traceable", description: "Traceable to US NIST standards" },
  { value: "ukas", label: "UKAS Accredited", description: "UK Accreditation Service certified" },
  {
    value: "sanas",
    label: "SANAS Accredited",
    description: "South African National Accreditation System",
  },
  { value: "iso_17025", label: "ISO/IEC 17025", description: "Accredited calibration laboratory" },
  {
    value: "5_point",
    label: "5-Point Calibration",
    description: "Calibration at 5 points across range",
  },
  {
    value: "wet_calibration",
    label: "Wet Calibration",
    description: "Calibrated with actual fluid/gas",
  },
];
