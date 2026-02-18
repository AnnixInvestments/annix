export interface ProductCategory {
  value: string;
  label: string;
  searchTerms: string[];
}

export interface SubIndustry {
  value: string;
  label: string;
  productCategories: ProductCategory[];
}

export interface Industry {
  value: string;
  label: string;
  subIndustries: SubIndustry[];
}

export const INDUSTRIES: Industry[] = [
  {
    value: "mining",
    label: "Mining & Resources",
    subIndustries: [
      {
        value: "piping_fluid_systems",
        label: "Piping & Fluid Systems",
        productCategories: [
          {
            value: "steel_pipes",
            label: "Steel Pipes & Tubes",
            searchTerms: [
              "steel pipe supplier",
              "carbon steel pipe",
              "pipe manufacturer",
              "seamless pipe",
              "welded pipe",
              "line pipe",
              "casing pipe",
              "mine piping",
            ],
          },
          {
            value: "hdpe_pipes",
            label: "HDPE & Plastic Pipes",
            searchTerms: [
              "hdpe pipe",
              "polyethylene pipe",
              "plastic pipe supplier",
              "pe100",
              "poly pipe",
              "slurry pipe",
            ],
          },
          {
            value: "pipe_fittings",
            label: "Pipe Fittings",
            searchTerms: [
              "pipe fittings",
              "elbow",
              "tee",
              "reducer",
              "coupling",
              "flange fitting",
              "butt weld fittings",
              "socket weld",
            ],
          },
          {
            value: "flanges",
            label: "Flanges",
            searchTerms: [
              "flange supplier",
              "weld neck flange",
              "slip on flange",
              "blind flange",
              "spectacle blind",
              "orifice flange",
              "lap joint flange",
            ],
          },
          {
            value: "valves",
            label: "Valves",
            searchTerms: [
              "valve supplier",
              "gate valve",
              "ball valve",
              "butterfly valve",
              "check valve",
              "globe valve",
              "knife gate valve",
              "slurry valve",
              "pinch valve",
            ],
          },
          {
            value: "gaskets_seals",
            label: "Gaskets & Seals",
            searchTerms: [
              "gasket supplier",
              "spiral wound gasket",
              "ring joint gasket",
              "rubber gasket",
              "ptfe gasket",
              "kammprofile",
              "sheet gasket",
            ],
          },
          {
            value: "expansion_joints",
            label: "Expansion Joints & Bellows",
            searchTerms: [
              "expansion joint",
              "bellows",
              "flexible connector",
              "rubber expansion joint",
              "metal expansion joint",
            ],
          },
          {
            value: "pipe_supports",
            label: "Pipe Supports & Hangers",
            searchTerms: [
              "pipe support",
              "pipe hanger",
              "pipe clamp",
              "u-bolt",
              "pipe saddle",
              "pipe shoe",
              "spring hanger",
            ],
          },
          {
            value: "couplings_unions",
            label: "Couplings & Unions",
            searchTerms: [
              "pipe coupling",
              "victaulic",
              "grooved coupling",
              "dresser coupling",
              "union fitting",
              "quick connect",
              "camlock",
            ],
          },
        ],
      },
      {
        value: "tanks_vessels",
        label: "Tanks & Pressure Vessels",
        productCategories: [
          {
            value: "storage_tanks",
            label: "Storage Tanks",
            searchTerms: [
              "storage tank",
              "water tank",
              "fuel tank",
              "chemical tank",
              "tank manufacturer",
              "above ground tank",
              "underground tank",
            ],
          },
          {
            value: "pressure_vessels",
            label: "Pressure Vessels",
            searchTerms: [
              "pressure vessel",
              "reactor vessel",
              "process vessel",
              "asme vessel",
              "boiler",
              "heat exchanger",
            ],
          },
          {
            value: "silos_hoppers",
            label: "Silos & Hoppers",
            searchTerms: [
              "silo",
              "hopper",
              "bin",
              "bulk storage",
              "cement silo",
              "ore bin",
              "surge bin",
            ],
          },
          {
            value: "tank_fittings",
            label: "Tank Fittings & Accessories",
            searchTerms: [
              "tank fitting",
              "manhole",
              "nozzle",
              "level gauge",
              "tank vent",
              "tank valve",
              "sight glass",
            ],
          },
          {
            value: "frp_tanks",
            label: "FRP & Lined Tanks",
            searchTerms: [
              "frp tank",
              "fiberglass tank",
              "lined tank",
              "rubber lined tank",
              "corrosion resistant tank",
            ],
          },
          {
            value: "ibc_drums",
            label: "IBCs & Drums",
            searchTerms: [
              "ibc container",
              "intermediate bulk container",
              "drum",
              "barrel",
              "chemical drum",
              "bulk container",
            ],
          },
        ],
      },
      {
        value: "fasteners_hardware",
        label: "Fasteners & Hardware",
        productCategories: [
          {
            value: "bolts",
            label: "Bolts",
            searchTerms: [
              "bolt supplier",
              "hex bolt",
              "structural bolt",
              "anchor bolt",
              "stud bolt",
              "foundation bolt",
              "high tensile bolt",
              "mining bolt",
            ],
          },
          {
            value: "nuts",
            label: "Nuts",
            searchTerms: [
              "nut supplier",
              "hex nut",
              "lock nut",
              "flange nut",
              "coupling nut",
              "heavy hex nut",
              "nylon lock nut",
            ],
          },
          {
            value: "washers",
            label: "Washers",
            searchTerms: [
              "washer supplier",
              "flat washer",
              "spring washer",
              "lock washer",
              "hardened washer",
              "structural washer",
            ],
          },
          {
            value: "screws",
            label: "Screws",
            searchTerms: [
              "screw supplier",
              "self drilling screw",
              "set screw",
              "machine screw",
              "cap screw",
              "grub screw",
            ],
          },
          {
            value: "anchors",
            label: "Anchors & Fixings",
            searchTerms: [
              "anchor bolt",
              "chemical anchor",
              "expansion anchor",
              "resin anchor",
              "rock bolt",
              "ground anchor",
              "concrete anchor",
            ],
          },
          {
            value: "threaded_rod",
            label: "Threaded Rod & Studs",
            searchTerms: ["threaded rod", "all thread", "stud", "tie rod", "threaded bar"],
          },
          {
            value: "pins_clips",
            label: "Pins, Clips & Retainers",
            searchTerms: [
              "pin supplier",
              "clevis pin",
              "cotter pin",
              "lynch pin",
              "circlip",
              "retaining ring",
              "split pin",
            ],
          },
          {
            value: "chains_shackles",
            label: "Chains & Shackles",
            searchTerms: [
              "chain supplier",
              "lifting chain",
              "anchor chain",
              "shackle",
              "hook",
              "link chain",
              "grade 80 chain",
            ],
          },
          {
            value: "specialty_fasteners",
            label: "Specialty Fasteners",
            searchTerms: [
              "specialty fastener",
              "vibration resistant",
              "self-locking",
              "prevailing torque",
              "tamper proof",
            ],
          },
        ],
      },
      {
        value: "sundries_consumables",
        label: "Sundries & Consumables",
        productCategories: [
          {
            value: "tape_adhesives",
            label: "Tapes & Adhesives",
            searchTerms: [
              "industrial tape",
              "teflon tape",
              "pipe tape",
              "insulation tape",
              "adhesive",
              "sealant",
              "thread sealant",
              "pipe dope",
            ],
          },
          {
            value: "lubricants_greases",
            label: "Lubricants & Greases",
            searchTerms: [
              "lubricant",
              "grease",
              "anti-seize",
              "penetrating oil",
              "thread lubricant",
              "bearing grease",
              "mining lubricant",
            ],
          },
          {
            value: "cleaning_chemicals",
            label: "Cleaning & Chemicals",
            searchTerms: [
              "industrial cleaner",
              "degreaser",
              "solvent",
              "rust remover",
              "descaler",
              "chemical cleaning",
            ],
          },
          {
            value: "marking_paint",
            label: "Marking & Paint",
            searchTerms: [
              "marking paint",
              "spray paint",
              "industrial paint",
              "line marking",
              "primer",
              "corrosion protection",
            ],
          },
          {
            value: "cable_ties_clamps",
            label: "Cable Ties & Clamps",
            searchTerms: [
              "cable tie",
              "zip tie",
              "hose clamp",
              "jubilee clip",
              "worm drive clamp",
              "cable management",
            ],
          },
          {
            value: "rags_wipers",
            label: "Rags, Wipers & Absorbents",
            searchTerms: [
              "industrial rag",
              "wiper",
              "absorbent",
              "spill kit",
              "oil absorbent",
              "cleaning cloth",
            ],
          },
          {
            value: "packing_sealing",
            label: "Packing & Sealing Materials",
            searchTerms: [
              "gland packing",
              "mechanical packing",
              "compression packing",
              "ptfe packing",
              "graphite packing",
            ],
          },
          {
            value: "o_rings",
            label: "O-Rings & Sealing Rings",
            searchTerms: [
              "o-ring supplier",
              "nitrile o-ring",
              "viton o-ring",
              "silicone o-ring",
              "hydraulic seal",
              "backup ring",
            ],
          },
          {
            value: "filter_elements",
            label: "Filter Elements",
            searchTerms: [
              "filter element",
              "hydraulic filter",
              "oil filter",
              "air filter",
              "strainer",
              "filter cartridge",
            ],
          },
          {
            value: "hose_fittings",
            label: "Hoses & Hose Fittings",
            searchTerms: [
              "industrial hose",
              "hydraulic hose",
              "suction hose",
              "discharge hose",
              "hose fitting",
              "hose clamp",
              "cam lock",
            ],
          },
        ],
      },
      {
        value: "mining_equipment",
        label: "Mining Equipment & Machinery",
        productCategories: [
          {
            value: "drilling_equipment",
            label: "Drilling Equipment",
            searchTerms: [
              "drill rig",
              "rock drill",
              "percussion drill",
              "diamond drill",
              "exploration drilling",
              "blast hole drill",
            ],
          },
          {
            value: "crushing_screening",
            label: "Crushing & Screening",
            searchTerms: [
              "crusher",
              "jaw crusher",
              "cone crusher",
              "screen",
              "vibrating screen",
              "screening equipment",
            ],
          },
          {
            value: "grinding_milling",
            label: "Grinding & Milling",
            searchTerms: [
              "ball mill",
              "sag mill",
              "grinding mill",
              "rod mill",
              "mill liner",
              "grinding media",
            ],
          },
          {
            value: "loading_hauling",
            label: "Loading & Hauling",
            searchTerms: [
              "haul truck",
              "loader",
              "lhd",
              "dump truck",
              "mining truck",
              "load haul dump",
            ],
          },
          {
            value: "underground_equipment",
            label: "Underground Equipment",
            searchTerms: [
              "underground mining",
              "roof bolter",
              "shuttle car",
              "continuous miner",
              "ventilation fan",
            ],
          },
          {
            value: "processing_equipment",
            label: "Processing Equipment",
            searchTerms: [
              "mineral processing",
              "flotation cell",
              "thickener",
              "cyclone",
              "magnetic separator",
              "leaching equipment",
            ],
          },
        ],
      },
      {
        value: "pumps_dewatering",
        label: "Pumps & Dewatering",
        productCategories: [
          {
            value: "slurry_pumps",
            label: "Slurry Pumps",
            searchTerms: [
              "slurry pump",
              "warman pump",
              "horizontal slurry pump",
              "vertical slurry pump",
              "submersible slurry pump",
            ],
          },
          {
            value: "dewatering_pumps",
            label: "Dewatering Pumps",
            searchTerms: [
              "dewatering pump",
              "submersible pump",
              "borehole pump",
              "well point",
              "mine dewatering",
            ],
          },
          {
            value: "centrifugal_pumps",
            label: "Centrifugal Pumps",
            searchTerms: [
              "centrifugal pump",
              "process pump",
              "transfer pump",
              "end suction pump",
              "multistage pump",
            ],
          },
          {
            value: "positive_displacement",
            label: "Positive Displacement Pumps",
            searchTerms: [
              "piston pump",
              "diaphragm pump",
              "peristaltic pump",
              "progressive cavity pump",
              "gear pump",
            ],
          },
          {
            value: "pump_spares",
            label: "Pump Spares & Components",
            searchTerms: [
              "pump impeller",
              "pump seal",
              "pump shaft",
              "pump bearing",
              "wear plate",
              "pump liner",
            ],
          },
          {
            value: "pump_accessories",
            label: "Pump Accessories",
            searchTerms: [
              "pump base",
              "coupling",
              "pump guard",
              "priming system",
              "foot valve",
              "suction strainer",
            ],
          },
        ],
      },
      {
        value: "conveyor_material_handling",
        label: "Conveyor & Material Handling",
        productCategories: [
          {
            value: "conveyor_belts",
            label: "Conveyor Belts",
            searchTerms: [
              "conveyor belt",
              "rubber belt",
              "steel cord belt",
              "fabric belt",
              "chevron belt",
              "pipe conveyor belt",
            ],
          },
          {
            value: "idlers_pulleys",
            label: "Idlers & Pulleys",
            searchTerms: [
              "conveyor idler",
              "carrying idler",
              "return idler",
              "impact idler",
              "drive pulley",
              "tail pulley",
              "snub pulley",
            ],
          },
          {
            value: "conveyor_components",
            label: "Conveyor Components",
            searchTerms: [
              "belt scraper",
              "belt cleaner",
              "skirting rubber",
              "conveyor frame",
              "take-up",
              "belt tracker",
            ],
          },
          {
            value: "feeders_chutes",
            label: "Feeders & Chutes",
            searchTerms: [
              "vibrating feeder",
              "apron feeder",
              "belt feeder",
              "transfer chute",
              "impact bed",
              "loading chute",
            ],
          },
          {
            value: "bucket_elevators",
            label: "Bucket Elevators",
            searchTerms: [
              "bucket elevator",
              "elevator bucket",
              "elevator belt",
              "elevator chain",
              "vertical conveyor",
            ],
          },
          {
            value: "screw_conveyors",
            label: "Screw Conveyors",
            searchTerms: [
              "screw conveyor",
              "auger",
              "screw feeder",
              "shaftless screw",
              "flexible screw conveyor",
            ],
          },
        ],
      },
      {
        value: "wear_parts_liners",
        label: "Wear Parts & Liners",
        productCategories: [
          {
            value: "rubber_liners",
            label: "Rubber Liners & Lining",
            searchTerms: [
              "rubber lining",
              "rubber liner",
              "mill liner",
              "chute liner",
              "impact liner",
              "wear resistant rubber",
            ],
          },
          {
            value: "ceramic_liners",
            label: "Ceramic Liners & Tiles",
            searchTerms: [
              "ceramic liner",
              "ceramic tile",
              "alumina tile",
              "wear ceramic",
              "ceramic lining",
            ],
          },
          {
            value: "wear_plates",
            label: "Wear Plates & Overlays",
            searchTerms: [
              "wear plate",
              "hardox",
              "chromium carbide",
              "overlay plate",
              "hardfacing",
              "bisalloy",
            ],
          },
          {
            value: "mill_liners",
            label: "Mill Liners",
            searchTerms: [
              "ball mill liner",
              "sag mill liner",
              "mill shell liner",
              "mill head liner",
              "rubber mill liner",
            ],
          },
          {
            value: "screen_media",
            label: "Screen Media & Panels",
            searchTerms: [
              "screen panel",
              "polyurethane screen",
              "rubber screen",
              "woven wire screen",
              "wedge wire screen",
            ],
          },
          {
            value: "crusher_wear",
            label: "Crusher Wear Parts",
            searchTerms: [
              "crusher liner",
              "jaw plate",
              "mantle",
              "bowl liner",
              "impact bar",
              "blow bar",
            ],
          },
        ],
      },
      {
        value: "electrical_instrumentation",
        label: "Electrical & Instrumentation",
        productCategories: [
          {
            value: "mining_cables",
            label: "Mining Cables",
            searchTerms: [
              "mining cable",
              "trailing cable",
              "reeling cable",
              "armoured cable",
              "flexible cable",
              "power cable",
            ],
          },
          {
            value: "switchgear_mcc",
            label: "Switchgear & MCCs",
            searchTerms: [
              "motor control center",
              "mcc",
              "switchgear",
              "soft starter",
              "vsd",
              "variable speed drive",
            ],
          },
          {
            value: "transformers",
            label: "Transformers",
            searchTerms: [
              "transformer",
              "distribution transformer",
              "mining transformer",
              "dry type transformer",
              "oil filled transformer",
            ],
          },
          {
            value: "instrumentation",
            label: "Instrumentation",
            searchTerms: [
              "flow meter",
              "level sensor",
              "pressure gauge",
              "temperature sensor",
              "process instrumentation",
            ],
          },
          {
            value: "junction_boxes",
            label: "Junction Boxes & Enclosures",
            searchTerms: [
              "junction box",
              "enclosure",
              "control panel",
              "flameproof enclosure",
              "explosion proof",
            ],
          },
          {
            value: "lighting",
            label: "Mining Lighting",
            searchTerms: [
              "mining light",
              "tunnel lighting",
              "explosion proof light",
              "led mining light",
              "floodlight",
            ],
          },
        ],
      },
      {
        value: "safety_ppe_mining",
        label: "Mining Safety & PPE",
        productCategories: [
          {
            value: "hard_hats",
            label: "Hard Hats & Head Protection",
            searchTerms: [
              "hard hat",
              "mining helmet",
              "cap lamp",
              "head protection",
              "safety helmet",
            ],
          },
          {
            value: "respiratory",
            label: "Respiratory Protection",
            searchTerms: [
              "respirator",
              "dust mask",
              "self rescuer",
              "breathing apparatus",
              "air purifying",
            ],
          },
          {
            value: "protective_clothing",
            label: "Protective Clothing",
            searchTerms: [
              "high vis clothing",
              "flame retardant",
              "fr clothing",
              "coverall",
              "mining workwear",
            ],
          },
          {
            value: "fall_protection",
            label: "Fall Protection",
            searchTerms: [
              "safety harness",
              "lanyard",
              "fall arrester",
              "anchor point",
              "rescue equipment",
            ],
          },
          {
            value: "hearing_protection",
            label: "Hearing Protection",
            searchTerms: ["ear muff", "ear plug", "hearing protection", "noise reduction"],
          },
          {
            value: "hand_protection",
            label: "Hand Protection",
            searchTerms: [
              "safety glove",
              "mining glove",
              "cut resistant glove",
              "impact glove",
              "chemical glove",
            ],
          },
          {
            value: "foot_protection",
            label: "Foot Protection",
            searchTerms: [
              "safety boot",
              "mining boot",
              "gumboot",
              "metatarsal boot",
              "steel toe boot",
            ],
          },
          {
            value: "gas_detection",
            label: "Gas Detection",
            searchTerms: [
              "gas detector",
              "multi gas monitor",
              "single gas detector",
              "fixed gas detection",
              "portable detector",
            ],
          },
        ],
      },
      {
        value: "structural_steel",
        label: "Structural Steel & Fabrication",
        productCategories: [
          {
            value: "structural_sections",
            label: "Structural Sections",
            searchTerms: [
              "i-beam",
              "h-beam",
              "channel",
              "angle iron",
              "structural steel",
              "universal beam",
              "universal column",
            ],
          },
          {
            value: "plate_sheet",
            label: "Plate & Sheet Steel",
            searchTerms: [
              "steel plate",
              "floor plate",
              "checker plate",
              "sheet steel",
              "wear plate",
              "boiler plate",
            ],
          },
          {
            value: "hollow_sections",
            label: "Hollow Sections",
            searchTerms: ["square tube", "rectangular tube", "rhs", "shs", "chs", "hollow section"],
          },
          {
            value: "grating_mesh",
            label: "Grating & Mesh",
            searchTerms: [
              "steel grating",
              "bar grating",
              "expanded metal",
              "weld mesh",
              "walkway grating",
              "platform grating",
            ],
          },
          {
            value: "handrail_stairs",
            label: "Handrails & Stairs",
            searchTerms: [
              "handrail",
              "stair tread",
              "kick plate",
              "stanchion",
              "ball fence",
              "safety rail",
            ],
          },
          {
            value: "fabrication_services",
            label: "Fabrication Services",
            searchTerms: [
              "steel fabrication",
              "welding",
              "cutting",
              "bending",
              "rolling",
              "machining",
            ],
          },
        ],
      },
      {
        value: "ventilation_cooling",
        label: "Ventilation & Cooling",
        productCategories: [
          {
            value: "mine_fans",
            label: "Mine Fans",
            searchTerms: [
              "mine fan",
              "auxiliary fan",
              "booster fan",
              "main fan",
              "axial fan",
              "centrifugal fan",
            ],
          },
          {
            value: "ventilation_ducting",
            label: "Ventilation Ducting",
            searchTerms: [
              "ventilation duct",
              "flexible duct",
              "layflat duct",
              "rigid duct",
              "vent tubing",
            ],
          },
          {
            value: "cooling_systems",
            label: "Cooling Systems",
            searchTerms: [
              "mine cooling",
              "refrigeration",
              "bulk air cooler",
              "spot cooler",
              "ice plant",
            ],
          },
          {
            value: "dust_suppression",
            label: "Dust Suppression",
            searchTerms: [
              "dust suppression",
              "water spray",
              "fog cannon",
              "dust collector",
              "wet scrubber",
            ],
          },
          {
            value: "air_doors",
            label: "Air Doors & Regulators",
            searchTerms: ["air door", "ventilation door", "regulator", "air lock", "stopping"],
          },
        ],
      },
    ],
  },
  {
    value: "construction",
    label: "Construction & Building Materials",
    subIndustries: [
      {
        value: "steel_fabrication",
        label: "Steel & Metal Fabrication",
        productCategories: [
          {
            value: "structural_steel",
            label: "Structural Steel",
            searchTerms: [
              "steel fabricator",
              "structural steel",
              "metal fabrication",
              "steel supplier",
            ],
          },
          {
            value: "piping_systems",
            label: "Piping Systems",
            searchTerms: [
              "pipe supplier",
              "piping contractor",
              "industrial piping",
              "pipe fabrication",
            ],
          },
          {
            value: "sheet_metal",
            label: "Sheet Metal Products",
            searchTerms: ["sheet metal", "metal roofing", "cladding", "metal sheets"],
          },
          {
            value: "welding_supplies",
            label: "Welding Supplies & Equipment",
            searchTerms: ["welding supplies", "welding equipment", "welding consumables"],
          },
        ],
      },
      {
        value: "plumbing_hvac",
        label: "Plumbing & HVAC",
        productCategories: [
          {
            value: "plumbing_supplies",
            label: "Plumbing Supplies",
            searchTerms: [
              "plumbing supplier",
              "plumber",
              "plumbing contractor",
              "pipes and fittings",
            ],
          },
          {
            value: "hvac_systems",
            label: "HVAC Systems",
            searchTerms: ["hvac contractor", "air conditioning", "heating systems", "ventilation"],
          },
          {
            value: "pumps_valves",
            label: "Pumps & Valves",
            searchTerms: ["pump supplier", "valve supplier", "industrial pumps", "control valves"],
          },
          {
            value: "water_treatment",
            label: "Water Treatment Equipment",
            searchTerms: ["water treatment", "filtration systems", "water purification"],
          },
        ],
      },
      {
        value: "electrical",
        label: "Electrical Equipment & Supplies",
        productCategories: [
          {
            value: "electrical_supplies",
            label: "Electrical Supplies",
            searchTerms: ["electrical supplier", "electrician", "electrical contractor", "wiring"],
          },
          {
            value: "lighting",
            label: "Commercial Lighting",
            searchTerms: [
              "lighting supplier",
              "commercial lighting",
              "led lighting",
              "industrial lighting",
            ],
          },
          {
            value: "switchgear",
            label: "Switchgear & Panels",
            searchTerms: [
              "switchgear",
              "electrical panels",
              "distribution boards",
              "motor control",
            ],
          },
          {
            value: "cable_wire",
            label: "Cable & Wire",
            searchTerms: ["cable supplier", "wire manufacturer", "electrical cable", "power cable"],
          },
        ],
      },
      {
        value: "building_materials",
        label: "Building Materials",
        productCategories: [
          {
            value: "concrete_cement",
            label: "Concrete & Cement",
            searchTerms: [
              "concrete supplier",
              "cement supplier",
              "ready mix concrete",
              "precast concrete",
            ],
          },
          {
            value: "timber_lumber",
            label: "Timber & Lumber",
            searchTerms: ["timber supplier", "lumber yard", "wood supplier", "building timber"],
          },
          {
            value: "roofing",
            label: "Roofing Materials",
            searchTerms: ["roofing supplier", "roof tiles", "roofing contractor", "waterproofing"],
          },
          {
            value: "insulation",
            label: "Insulation & Drywall",
            searchTerms: ["insulation supplier", "drywall", "ceiling boards", "thermal insulation"],
          },
        ],
      },
      {
        value: "heavy_equipment",
        label: "Heavy Equipment & Machinery",
        productCategories: [
          {
            value: "earthmoving",
            label: "Earthmoving Equipment",
            searchTerms: ["earthmoving", "excavator", "bulldozer", "construction equipment"],
          },
          {
            value: "cranes_lifting",
            label: "Cranes & Lifting Equipment",
            searchTerms: ["crane hire", "lifting equipment", "hoists", "forklifts"],
          },
          {
            value: "concrete_equipment",
            label: "Concrete Equipment",
            searchTerms: ["concrete mixer", "concrete pump", "batching plant"],
          },
          {
            value: "scaffolding",
            label: "Scaffolding & Formwork",
            searchTerms: ["scaffolding", "formwork", "shoring", "temporary structures"],
          },
        ],
      },
    ],
  },
  {
    value: "manufacturing",
    label: "Manufacturing & Industrial",
    subIndustries: [
      {
        value: "industrial_machinery",
        label: "Industrial Machinery & Equipment",
        productCategories: [
          {
            value: "production_machinery",
            label: "Production Machinery",
            searchTerms: [
              "manufacturing equipment",
              "production line",
              "industrial machinery",
              "factory equipment",
            ],
          },
          {
            value: "cnc_machines",
            label: "CNC & Precision Machines",
            searchTerms: ["cnc machine", "precision engineering", "machining center", "lathe"],
          },
          {
            value: "packaging_machines",
            label: "Packaging Machinery",
            searchTerms: ["packaging machine", "filling machine", "labeling machine", "bottling"],
          },
          {
            value: "conveyor_systems",
            label: "Conveyor Systems",
            searchTerms: ["conveyor", "material handling", "belt conveyor", "sorting systems"],
          },
        ],
      },
      {
        value: "industrial_supplies",
        label: "Industrial Supplies & Components",
        productCategories: [
          {
            value: "bearings_seals",
            label: "Bearings & Seals",
            searchTerms: ["bearing supplier", "industrial bearings", "seals", "gaskets"],
          },
          {
            value: "fasteners",
            label: "Fasteners & Hardware",
            searchTerms: ["fasteners", "bolts", "nuts", "industrial hardware", "screws"],
          },
          {
            value: "tools_abrasives",
            label: "Tools & Abrasives",
            searchTerms: ["industrial tools", "cutting tools", "abrasives", "grinding wheels"],
          },
          {
            value: "lubricants",
            label: "Lubricants & Fluids",
            searchTerms: ["industrial lubricants", "hydraulic oil", "cutting fluids", "greases"],
          },
        ],
      },
      {
        value: "chemicals",
        label: "Chemicals & Raw Materials",
        productCategories: [
          {
            value: "industrial_chemicals",
            label: "Industrial Chemicals",
            searchTerms: ["chemical supplier", "industrial chemicals", "solvents", "acids"],
          },
          {
            value: "plastics_polymers",
            label: "Plastics & Polymers",
            searchTerms: ["plastic supplier", "polymer", "resin", "plastic raw materials"],
          },
          {
            value: "paints_coatings",
            label: "Paints & Coatings",
            searchTerms: ["industrial paint", "coatings", "powder coating", "protective coatings"],
          },
          {
            value: "adhesives",
            label: "Adhesives & Sealants",
            searchTerms: ["industrial adhesive", "sealant", "bonding", "epoxy"],
          },
        ],
      },
      {
        value: "safety_ppe",
        label: "Safety & PPE",
        productCategories: [
          {
            value: "ppe",
            label: "Personal Protective Equipment",
            searchTerms: ["ppe supplier", "safety equipment", "protective clothing", "safety gear"],
          },
          {
            value: "safety_signage",
            label: "Safety Signage & Equipment",
            searchTerms: ["safety signs", "fire equipment", "first aid", "emergency equipment"],
          },
          {
            value: "fall_protection",
            label: "Fall Protection",
            searchTerms: ["fall protection", "harness", "safety nets", "guardrails"],
          },
          {
            value: "respiratory",
            label: "Respiratory Protection",
            searchTerms: ["respirators", "dust masks", "breathing apparatus", "air filtration"],
          },
        ],
      },
    ],
  },
  {
    value: "medical",
    label: "Medical & Healthcare",
    subIndustries: [
      {
        value: "medical_devices",
        label: "Medical Devices & Equipment",
        productCategories: [
          {
            value: "diagnostic_equipment",
            label: "Diagnostic Equipment",
            searchTerms: [
              "medical diagnostic",
              "imaging equipment",
              "x-ray",
              "ultrasound",
              "hospital",
            ],
          },
          {
            value: "surgical_equipment",
            label: "Surgical Equipment",
            searchTerms: [
              "surgical instruments",
              "operating room",
              "surgical supplies",
              "hospital",
            ],
          },
          {
            value: "patient_monitoring",
            label: "Patient Monitoring",
            searchTerms: ["patient monitor", "vital signs", "medical monitoring", "clinic"],
          },
          {
            value: "rehabilitation",
            label: "Rehabilitation Equipment",
            searchTerms: ["rehabilitation", "physiotherapy", "mobility aids", "medical supplies"],
          },
        ],
      },
      {
        value: "pharmaceuticals",
        label: "Pharmaceuticals",
        productCategories: [
          {
            value: "prescription_drugs",
            label: "Prescription Medications",
            searchTerms: ["pharmacy", "pharmaceutical", "prescription", "medication", "chemist"],
          },
          {
            value: "otc_products",
            label: "OTC Products",
            searchTerms: ["pharmacy", "over the counter", "health products", "vitamins"],
          },
          {
            value: "medical_consumables",
            label: "Medical Consumables",
            searchTerms: ["medical supplies", "disposables", "syringes", "bandages", "clinic"],
          },
          {
            value: "veterinary",
            label: "Veterinary Products",
            searchTerms: ["veterinary", "animal health", "vet supplies", "pet medication"],
          },
        ],
      },
      {
        value: "laboratory",
        label: "Laboratory Equipment",
        productCategories: [
          {
            value: "lab_instruments",
            label: "Lab Instruments",
            searchTerms: [
              "laboratory equipment",
              "lab instruments",
              "analytical",
              "testing equipment",
            ],
          },
          {
            value: "lab_consumables",
            label: "Lab Consumables",
            searchTerms: ["lab supplies", "test tubes", "petri dishes", "lab consumables"],
          },
          {
            value: "lab_furniture",
            label: "Lab Furniture",
            searchTerms: ["lab furniture", "fume hoods", "lab benches", "storage cabinets"],
          },
          {
            value: "scientific_research",
            label: "Scientific Research",
            searchTerms: [
              "research equipment",
              "scientific instruments",
              "microscopes",
              "spectrometers",
            ],
          },
        ],
      },
    ],
  },
  {
    value: "technology",
    label: "Technology & Telecommunications",
    subIndustries: [
      {
        value: "enterprise_software",
        label: "Enterprise Software & SaaS",
        productCategories: [
          {
            value: "erp_systems",
            label: "ERP Systems",
            searchTerms: [
              "erp software",
              "enterprise resource planning",
              "business software",
              "sap",
              "oracle",
            ],
          },
          {
            value: "crm_software",
            label: "CRM Software",
            searchTerms: ["crm", "customer relationship", "salesforce", "sales software"],
          },
          {
            value: "accounting_software",
            label: "Accounting Software",
            searchTerms: ["accounting software", "financial software", "bookkeeping", "invoicing"],
          },
          {
            value: "hr_software",
            label: "HR & Payroll Software",
            searchTerms: ["hr software", "payroll", "human resources", "workforce management"],
          },
        ],
      },
      {
        value: "it_hardware",
        label: "IT Hardware & Equipment",
        productCategories: [
          {
            value: "computers_laptops",
            label: "Computers & Laptops",
            searchTerms: ["computer supplier", "laptop", "desktop", "workstation", "pc"],
          },
          {
            value: "servers_storage",
            label: "Servers & Storage",
            searchTerms: ["server", "data storage", "nas", "san", "data center"],
          },
          {
            value: "networking",
            label: "Networking Equipment",
            searchTerms: ["networking", "router", "switch", "firewall", "wifi"],
          },
          {
            value: "peripherals",
            label: "Peripherals & Accessories",
            searchTerms: ["printer", "monitor", "keyboard", "computer accessories"],
          },
        ],
      },
      {
        value: "telecommunications",
        label: "Telecommunications",
        productCategories: [
          {
            value: "telecom_equipment",
            label: "Telecom Equipment",
            searchTerms: ["telecommunications", "telecom equipment", "phone systems", "pbx"],
          },
          {
            value: "fiber_cable",
            label: "Fiber & Cabling",
            searchTerms: ["fiber optic", "network cabling", "structured cabling", "data cable"],
          },
          {
            value: "wireless_systems",
            label: "Wireless Systems",
            searchTerms: ["wireless", "radio", "antenna", "cellular", "mobile network"],
          },
          {
            value: "voip_unified",
            label: "VoIP & Unified Communications",
            searchTerms: ["voip", "unified communications", "video conferencing", "collaboration"],
          },
        ],
      },
      {
        value: "cybersecurity",
        label: "Cybersecurity",
        productCategories: [
          {
            value: "security_software",
            label: "Security Software",
            searchTerms: ["antivirus", "security software", "endpoint protection", "malware"],
          },
          {
            value: "network_security",
            label: "Network Security",
            searchTerms: ["firewall", "intrusion detection", "network security", "vpn"],
          },
          {
            value: "identity_access",
            label: "Identity & Access Management",
            searchTerms: ["identity management", "access control", "authentication", "sso"],
          },
          {
            value: "security_services",
            label: "Security Services",
            searchTerms: [
              "security consulting",
              "penetration testing",
              "security audit",
              "compliance",
            ],
          },
        ],
      },
    ],
  },
  {
    value: "agriculture",
    label: "Agriculture & Food Service",
    subIndustries: [
      {
        value: "farm_equipment",
        label: "Agricultural Equipment",
        productCategories: [
          {
            value: "tractors_machinery",
            label: "Tractors & Farm Machinery",
            searchTerms: ["tractor", "farm equipment", "agricultural machinery", "harvester"],
          },
          {
            value: "irrigation",
            label: "Irrigation Systems",
            searchTerms: ["irrigation", "sprinkler", "drip irrigation", "water systems", "farm"],
          },
          {
            value: "livestock_equipment",
            label: "Livestock Equipment",
            searchTerms: ["livestock", "cattle", "poultry equipment", "farm supplies"],
          },
          {
            value: "storage_handling",
            label: "Storage & Handling",
            searchTerms: ["grain storage", "silo", "farm storage", "handling equipment"],
          },
        ],
      },
      {
        value: "agri_supplies",
        label: "Agricultural Supplies",
        productCategories: [
          {
            value: "seeds_plants",
            label: "Seeds & Plants",
            searchTerms: ["seed supplier", "nursery", "seedlings", "agricultural seeds"],
          },
          {
            value: "fertilizers",
            label: "Fertilizers & Soil",
            searchTerms: ["fertilizer", "compost", "soil amendment", "plant nutrition"],
          },
          {
            value: "pesticides",
            label: "Pesticides & Crop Protection",
            searchTerms: ["pesticide", "herbicide", "crop protection", "pest control"],
          },
          {
            value: "animal_feed",
            label: "Animal Feed & Nutrition",
            searchTerms: ["animal feed", "livestock feed", "pet food", "feed supplier"],
          },
        ],
      },
      {
        value: "food_beverage",
        label: "Food & Beverage Distribution",
        productCategories: [
          {
            value: "food_wholesale",
            label: "Food Wholesale",
            searchTerms: ["food wholesaler", "food distributor", "wholesale food", "food supplier"],
          },
          {
            value: "beverage_distribution",
            label: "Beverage Distribution",
            searchTerms: [
              "beverage distributor",
              "drinks wholesale",
              "soft drinks",
              "alcohol distributor",
            ],
          },
          {
            value: "frozen_foods",
            label: "Frozen & Refrigerated",
            searchTerms: ["frozen food", "cold storage", "refrigerated", "ice cream"],
          },
          {
            value: "specialty_foods",
            label: "Specialty & Organic",
            searchTerms: ["organic food", "specialty foods", "gourmet", "health food"],
          },
        ],
      },
      {
        value: "restaurant_equipment",
        label: "Restaurant & Catering Equipment",
        productCategories: [
          {
            value: "kitchen_equipment",
            label: "Commercial Kitchen Equipment",
            searchTerms: [
              "commercial kitchen",
              "restaurant equipment",
              "catering equipment",
              "food service",
            ],
          },
          {
            value: "refrigeration",
            label: "Commercial Refrigeration",
            searchTerms: ["commercial fridge", "cold room", "display fridge", "freezer"],
          },
          {
            value: "smallwares",
            label: "Smallwares & Supplies",
            searchTerms: ["restaurant supplies", "kitchenware", "utensils", "disposables"],
          },
          {
            value: "pos_systems",
            label: "POS & Restaurant Tech",
            searchTerms: [
              "pos system",
              "restaurant software",
              "ordering system",
              "payment terminal",
            ],
          },
        ],
      },
    ],
  },
  {
    value: "wholesale",
    label: "Wholesale & Distribution",
    subIndustries: [
      {
        value: "general_merchandise",
        label: "General Merchandise",
        productCategories: [
          {
            value: "consumer_goods",
            label: "Consumer Goods",
            searchTerms: ["wholesaler", "consumer products", "fmcg", "retail supplier"],
          },
          {
            value: "household_products",
            label: "Household Products",
            searchTerms: ["household goods", "cleaning products", "home essentials", "domestic"],
          },
          {
            value: "personal_care",
            label: "Personal Care & Cosmetics",
            searchTerms: ["cosmetics wholesale", "personal care", "beauty products", "toiletries"],
          },
          {
            value: "stationery",
            label: "Stationery & Office Supplies",
            searchTerms: [
              "stationery supplier",
              "office supplies",
              "paper products",
              "office equipment",
            ],
          },
        ],
      },
      {
        value: "industrial_distribution",
        label: "Industrial Distribution",
        productCategories: [
          {
            value: "mro_supplies",
            label: "MRO Supplies",
            searchTerms: [
              "mro supplier",
              "maintenance supplies",
              "repair supplies",
              "industrial distributor",
            ],
          },
          {
            value: "janitorial",
            label: "Janitorial & Cleaning",
            searchTerms: [
              "janitorial supplies",
              "cleaning chemicals",
              "cleaning equipment",
              "facility supplies",
            ],
          },
          {
            value: "packaging",
            label: "Packaging Materials",
            searchTerms: [
              "packaging supplier",
              "boxes",
              "packaging materials",
              "shipping supplies",
            ],
          },
          {
            value: "safety_supplies",
            label: "Safety Supplies",
            searchTerms: ["safety supplier", "ppe distributor", "safety products", "workwear"],
          },
        ],
      },
      {
        value: "import_export",
        label: "Import & Export",
        productCategories: [
          {
            value: "trading_company",
            label: "Trading Companies",
            searchTerms: [
              "import export",
              "trading company",
              "international trade",
              "commodity trading",
            ],
          },
          {
            value: "customs_logistics",
            label: "Customs & Logistics",
            searchTerms: ["customs broker", "freight forwarder", "logistics", "shipping"],
          },
          {
            value: "sourcing",
            label: "Sourcing & Procurement",
            searchTerms: ["sourcing agent", "procurement", "supplier management", "buying agent"],
          },
          {
            value: "commodity_trading",
            label: "Commodity Trading",
            searchTerms: ["commodity trader", "raw materials", "bulk trading", "commodities"],
          },
        ],
      },
    ],
  },
  {
    value: "professional_services",
    label: "Professional Services",
    subIndustries: [
      {
        value: "marketing_advertising",
        label: "Marketing & Advertising",
        productCategories: [
          {
            value: "digital_marketing",
            label: "Digital Marketing",
            searchTerms: [
              "digital marketing",
              "seo",
              "social media marketing",
              "online advertising",
            ],
          },
          {
            value: "advertising_agency",
            label: "Advertising Agency Services",
            searchTerms: ["advertising agency", "creative agency", "branding", "ad agency"],
          },
          {
            value: "print_signage",
            label: "Print & Signage",
            searchTerms: ["printing", "signage", "banners", "promotional materials"],
          },
          {
            value: "events_promo",
            label: "Events & Promotions",
            searchTerms: ["event management", "promotions", "exhibitions", "corporate events"],
          },
        ],
      },
      {
        value: "it_consulting",
        label: "IT Services & Consulting",
        productCategories: [
          {
            value: "it_support",
            label: "IT Support & Managed Services",
            searchTerms: ["it support", "managed services", "helpdesk", "it outsourcing"],
          },
          {
            value: "software_dev",
            label: "Software Development",
            searchTerms: [
              "software development",
              "custom software",
              "app development",
              "web development",
            ],
          },
          {
            value: "cloud_services",
            label: "Cloud Services",
            searchTerms: ["cloud computing", "cloud migration", "aws", "azure", "cloud consulting"],
          },
          {
            value: "data_analytics",
            label: "Data & Analytics",
            searchTerms: ["data analytics", "business intelligence", "data science", "reporting"],
          },
        ],
      },
      {
        value: "financial_services",
        label: "Financial Services",
        productCategories: [
          {
            value: "accounting",
            label: "Accounting & Bookkeeping",
            searchTerms: ["accountant", "bookkeeping", "accounting firm", "tax services"],
          },
          {
            value: "insurance",
            label: "Business Insurance",
            searchTerms: [
              "insurance broker",
              "business insurance",
              "commercial insurance",
              "risk management",
            ],
          },
          {
            value: "banking",
            label: "Business Banking",
            searchTerms: [
              "business bank",
              "commercial banking",
              "merchant services",
              "business loans",
            ],
          },
          {
            value: "investment",
            label: "Investment & Wealth",
            searchTerms: [
              "investment advisor",
              "wealth management",
              "financial planning",
              "asset management",
            ],
          },
        ],
      },
      {
        value: "hr_staffing",
        label: "HR & Staffing",
        productCategories: [
          {
            value: "recruitment",
            label: "Recruitment & Staffing",
            searchTerms: ["recruitment agency", "staffing", "headhunter", "employment agency"],
          },
          {
            value: "hr_consulting",
            label: "HR Consulting",
            searchTerms: ["hr consulting", "human resources", "hr outsourcing", "payroll services"],
          },
          {
            value: "training",
            label: "Corporate Training",
            searchTerms: [
              "corporate training",
              "professional development",
              "skills training",
              "workshops",
            ],
          },
          {
            value: "background_checks",
            label: "Background Checks & Verification",
            searchTerms: ["background check", "verification", "screening", "employee checks"],
          },
        ],
      },
    ],
  },
  {
    value: "transportation",
    label: "Transportation & Logistics",
    subIndustries: [
      {
        value: "fleet_vehicles",
        label: "Fleet & Vehicles",
        productCategories: [
          {
            value: "commercial_vehicles",
            label: "Commercial Vehicles",
            searchTerms: ["truck dealer", "commercial vehicle", "fleet sales", "van sales"],
          },
          {
            value: "fleet_management",
            label: "Fleet Management",
            searchTerms: ["fleet management", "vehicle tracking", "telematics", "fleet services"],
          },
          {
            value: "vehicle_parts",
            label: "Vehicle Parts & Accessories",
            searchTerms: ["auto parts", "truck parts", "vehicle accessories", "spare parts"],
          },
          {
            value: "tyres_batteries",
            label: "Tyres & Batteries",
            searchTerms: ["tyre supplier", "commercial tyres", "battery supplier", "fleet tyres"],
          },
        ],
      },
      {
        value: "logistics_freight",
        label: "Logistics & Freight",
        productCategories: [
          {
            value: "freight_services",
            label: "Freight Services",
            searchTerms: ["freight company", "trucking", "road freight", "transport services"],
          },
          {
            value: "courier_delivery",
            label: "Courier & Delivery",
            searchTerms: [
              "courier service",
              "delivery service",
              "parcel delivery",
              "express delivery",
            ],
          },
          {
            value: "warehousing",
            label: "Warehousing & Storage",
            searchTerms: [
              "warehouse",
              "storage facility",
              "distribution center",
              "logistics warehouse",
            ],
          },
          {
            value: "cold_chain",
            label: "Cold Chain Logistics",
            searchTerms: [
              "cold chain",
              "refrigerated transport",
              "temperature controlled",
              "frozen logistics",
            ],
          },
        ],
      },
      {
        value: "fuel_energy",
        label: "Fuel & Energy",
        productCategories: [
          {
            value: "fuel_supply",
            label: "Fuel Supply",
            searchTerms: ["fuel supplier", "diesel supply", "petrol wholesale", "bulk fuel"],
          },
          {
            value: "lubricants_oils",
            label: "Lubricants & Oils",
            searchTerms: ["lubricant supplier", "motor oil", "industrial oils", "grease supplier"],
          },
          {
            value: "ev_charging",
            label: "EV Charging Infrastructure",
            searchTerms: [
              "ev charging",
              "electric vehicle",
              "charging station",
              "ev infrastructure",
            ],
          },
          {
            value: "fleet_cards",
            label: "Fleet Cards & Fuel Management",
            searchTerms: ["fleet card", "fuel card", "fuel management", "fleet fueling"],
          },
        ],
      },
    ],
  },
  {
    value: "energy",
    label: "Energy & Utilities",
    subIndustries: [
      {
        value: "renewable_energy",
        label: "Renewable Energy",
        productCategories: [
          {
            value: "solar",
            label: "Solar Energy Systems",
            searchTerms: ["solar panels", "solar installation", "photovoltaic", "solar power"],
          },
          {
            value: "wind",
            label: "Wind Energy",
            searchTerms: ["wind turbine", "wind energy", "wind farm", "wind power"],
          },
          {
            value: "battery_storage",
            label: "Battery & Energy Storage",
            searchTerms: ["battery storage", "energy storage", "backup power", "ups systems"],
          },
          {
            value: "energy_efficiency",
            label: "Energy Efficiency",
            searchTerms: [
              "energy audit",
              "energy efficiency",
              "power management",
              "energy consulting",
            ],
          },
        ],
      },
      {
        value: "oil_gas",
        label: "Oil & Gas",
        productCategories: [
          {
            value: "oilfield_equipment",
            label: "Oilfield Equipment",
            searchTerms: ["oilfield", "drilling equipment", "oil and gas", "petroleum equipment"],
          },
          {
            value: "pipeline",
            label: "Pipeline Equipment",
            searchTerms: ["pipeline", "pipe fittings", "valves", "pipeline construction"],
          },
          {
            value: "refinery",
            label: "Refinery Equipment",
            searchTerms: ["refinery", "petrochemical", "process equipment", "chemical plant"],
          },
          {
            value: "gas_equipment",
            label: "Gas Equipment",
            searchTerms: ["gas equipment", "lpg", "natural gas", "gas systems"],
          },
        ],
      },
      {
        value: "utilities",
        label: "Utilities Infrastructure",
        productCategories: [
          {
            value: "power_distribution",
            label: "Power Distribution",
            searchTerms: [
              "transformer",
              "switchgear",
              "power distribution",
              "electrical infrastructure",
            ],
          },
          {
            value: "water_utilities",
            label: "Water & Wastewater",
            searchTerms: [
              "water treatment",
              "wastewater",
              "pumping station",
              "water infrastructure",
            ],
          },
          {
            value: "metering",
            label: "Metering & Smart Grid",
            searchTerms: ["smart meter", "metering", "smart grid", "energy monitoring"],
          },
          {
            value: "utility_services",
            label: "Utility Services",
            searchTerms: ["utility contractor", "utility maintenance", "infrastructure services"],
          },
        ],
      },
    ],
  },
  {
    value: "real_estate",
    label: "Real Estate & Property",
    subIndustries: [
      {
        value: "commercial_property",
        label: "Commercial Property",
        productCategories: [
          {
            value: "office_space",
            label: "Office Space",
            searchTerms: [
              "office rental",
              "commercial property",
              "office building",
              "business park",
            ],
          },
          {
            value: "industrial_property",
            label: "Industrial Property",
            searchTerms: [
              "warehouse rental",
              "industrial property",
              "factory space",
              "logistics park",
            ],
          },
          {
            value: "retail_property",
            label: "Retail Property",
            searchTerms: ["retail space", "shopping center", "commercial retail", "storefront"],
          },
          {
            value: "property_management",
            label: "Property Management",
            searchTerms: [
              "property management",
              "building management",
              "facility management",
              "estate management",
            ],
          },
        ],
      },
      {
        value: "facilities",
        label: "Facilities Management",
        productCategories: [
          {
            value: "cleaning_services",
            label: "Commercial Cleaning",
            searchTerms: [
              "commercial cleaning",
              "office cleaning",
              "janitorial services",
              "cleaning contractor",
            ],
          },
          {
            value: "security_services",
            label: "Security Services",
            searchTerms: ["security company", "guarding services", "access control", "cctv"],
          },
          {
            value: "landscaping",
            label: "Landscaping & Grounds",
            searchTerms: ["landscaping", "grounds maintenance", "garden services", "lawn care"],
          },
          {
            value: "maintenance",
            label: "Building Maintenance",
            searchTerms: ["building maintenance", "handyman", "repairs", "facility maintenance"],
          },
        ],
      },
    ],
  },
  {
    value: "education",
    label: "Education & Training",
    subIndustries: [
      {
        value: "educational_supplies",
        label: "Educational Supplies",
        productCategories: [
          {
            value: "school_supplies",
            label: "School Supplies",
            searchTerms: [
              "school supplies",
              "educational materials",
              "stationery",
              "classroom supplies",
            ],
          },
          {
            value: "furniture",
            label: "Educational Furniture",
            searchTerms: ["school furniture", "classroom furniture", "desks", "chairs"],
          },
          {
            value: "technology",
            label: "Educational Technology",
            searchTerms: ["edtech", "interactive boards", "tablets", "school technology"],
          },
          {
            value: "sports_equipment",
            label: "Sports & Recreation",
            searchTerms: ["sports equipment", "playground", "gym equipment", "recreation"],
          },
        ],
      },
      {
        value: "training_services",
        label: "Training & Development",
        productCategories: [
          {
            value: "corporate_training",
            label: "Corporate Training",
            searchTerms: [
              "corporate training",
              "business training",
              "leadership development",
              "workshops",
            ],
          },
          {
            value: "technical_training",
            label: "Technical Training",
            searchTerms: [
              "technical training",
              "skills development",
              "certification",
              "vocational",
            ],
          },
          {
            value: "elearning",
            label: "E-Learning Platforms",
            searchTerms: ["elearning", "online courses", "lms", "learning management"],
          },
          {
            value: "safety_training",
            label: "Safety & Compliance Training",
            searchTerms: ["safety training", "compliance training", "osha", "health and safety"],
          },
        ],
      },
    ],
  },
  {
    value: "hospitality",
    label: "Hospitality & Entertainment",
    subIndustries: [
      {
        value: "hotel_supplies",
        label: "Hotel & Accommodation",
        productCategories: [
          {
            value: "hotel_amenities",
            label: "Hotel Amenities",
            searchTerms: ["hotel supplies", "amenities", "toiletries", "guest supplies"],
          },
          {
            value: "linens",
            label: "Linens & Textiles",
            searchTerms: ["hotel linen", "bedding", "towels", "hospitality textiles"],
          },
          {
            value: "hotel_furniture",
            label: "Hotel Furniture",
            searchTerms: [
              "hotel furniture",
              "hospitality furniture",
              "lobby furniture",
              "room furniture",
            ],
          },
          {
            value: "hotel_technology",
            label: "Hotel Technology",
            searchTerms: ["hotel software", "pms", "booking system", "hotel tech"],
          },
        ],
      },
      {
        value: "entertainment",
        label: "Entertainment & Leisure",
        productCategories: [
          {
            value: "av_equipment",
            label: "AV Equipment",
            searchTerms: ["audio visual", "av equipment", "projector", "sound system"],
          },
          {
            value: "gaming",
            label: "Gaming & Amusement",
            searchTerms: ["gaming", "arcade", "amusement", "entertainment equipment"],
          },
          {
            value: "fitness",
            label: "Fitness Equipment",
            searchTerms: ["gym equipment", "fitness", "exercise equipment", "commercial fitness"],
          },
          {
            value: "event_equipment",
            label: "Event Equipment",
            searchTerms: ["event equipment", "staging", "lighting", "event rental"],
          },
        ],
      },
    ],
  },
];

export type IndustryValue = (typeof INDUSTRIES)[number]["value"];

export const industryByValue = (value: string): Industry | null => {
  return INDUSTRIES.find((i) => i.value === value) ?? null;
};

export const subIndustryByValue = (
  industryValue: string,
  subIndustryValue: string,
): SubIndustry | null => {
  const industry = industryByValue(industryValue);
  return industry?.subIndustries.find((s) => s.value === subIndustryValue) ?? null;
};

export const productCategoryByValue = (
  industryValue: string,
  subIndustryValue: string,
  productCategoryValue: string,
): ProductCategory | null => {
  const subIndustry = subIndustryByValue(industryValue, subIndustryValue);
  return subIndustry?.productCategories.find((p) => p.value === productCategoryValue) ?? null;
};

export const searchTermsForSelection = (
  industryValue: string,
  subIndustryValue: string,
  productCategoryValues: string[],
): string[] => {
  const subIndustry = subIndustryByValue(industryValue, subIndustryValue);
  if (!subIndustry) return [];

  if (productCategoryValues.length === 0) {
    return subIndustry.productCategories.flatMap((p) => p.searchTerms);
  }

  return subIndustry.productCategories
    .filter((p) => productCategoryValues.includes(p.value))
    .flatMap((p) => p.searchTerms);
};

export const allIndustryLabels = (): Array<{ value: string; label: string }> => {
  return INDUSTRIES.map((i) => ({ value: i.value, label: i.label }));
};

export const subIndustryLabelsForIndustry = (
  industryValue: string,
): Array<{ value: string; label: string }> => {
  const industry = industryByValue(industryValue);
  return industry?.subIndustries.map((s) => ({ value: s.value, label: s.label })) ?? [];
};

export const productCategoryLabelsForSubIndustry = (
  industryValue: string,
  subIndustryValue: string,
): Array<{ value: string; label: string }> => {
  const subIndustry = subIndustryByValue(industryValue, subIndustryValue);
  return subIndustry?.productCategories.map((p) => ({ value: p.value, label: p.label })) ?? [];
};

export const productCategoryLabelsForSubIndustries = (
  industryValue: string,
  subIndustryValues: string[],
): Array<{ value: string; label: string; subIndustry: string }> => {
  const seen = new Set<string>();
  const results: Array<{ value: string; label: string; subIndustry: string }> = [];

  subIndustryValues.forEach((subIndustryValue) => {
    const subIndustry = subIndustryByValue(industryValue, subIndustryValue);
    if (subIndustry) {
      subIndustry.productCategories.forEach((p) => {
        if (!seen.has(p.value)) {
          seen.add(p.value);
          results.push({ value: p.value, label: p.label, subIndustry: subIndustryValue });
        }
      });
    }
  });

  return results;
};
