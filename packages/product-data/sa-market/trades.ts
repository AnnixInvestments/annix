import type { JobCategoryKey } from "./job-categories";

export const AVAILABILITY_VALUES = [
  "available_now",
  "14d_notice",
  "30d_notice",
  "not_currently",
] as const;

export type Availability = (typeof AVAILABILITY_VALUES)[number];

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available_now: "Available now",
  "14d_notice": "14 days notice",
  "30d_notice": "30 days notice",
  not_currently: "Not currently available",
};

export const WORK_EXPERIENCE_RANGES = [
  { value: 0, label: "No formal experience yet" },
  { value: 1, label: "0 - 1 year" },
  { value: 3, label: "2 - 3 years" },
  { value: 5, label: "4 - 5 years" },
  { value: 8, label: "6 - 8 years" },
  { value: 12, label: "9 - 12 years" },
  { value: 15, label: "13+ years" },
] as const;

export const TRAVEL_DISTANCE_RANGES = [
  { value: 0, label: "Remote or no travel" },
  { value: 10, label: "Up to 10 km" },
  { value: 25, label: "Up to 25 km" },
  { value: 50, label: "Up to 50 km" },
  { value: 100, label: "Up to 100 km" },
  { value: 250, label: "Up to 250 km" },
  { value: 500, label: "Up to 500 km" },
  { value: 2000, label: "Anywhere in South Africa" },
] as const;

export const WORK_ROLE_SUGGESTIONS = [
  "Accountant",
  "Accounts Clerk",
  "Administrative Assistant",
  "Architect",
  "Auto Electrician",
  "Boilermaker",
  "Bookkeeper",
  "Branch Manager",
  "Business Analyst",
  "Buyer",
  "Call Centre Agent",
  "Carpenter",
  "Cashier",
  "Civil Engineer",
  "Claims Administrator",
  "Compliance Officer",
  "Construction Foreman",
  "Customer Service Consultant",
  "Data Analyst",
  "Diesel Mechanic",
  "Driver",
  "Electrician",
  "Enrolled Nurse",
  "Estimator",
  "Factory Manager",
  "Financial Manager",
  "Fitter and Turner",
  "Forklift Operator",
  "General Manager",
  "Graphic Designer",
  "Health and Safety Officer",
  "HR Administrator",
  "HR Manager",
  "Industrial Engineer",
  "Instrumentation Technician",
  "Internal Sales Consultant",
  "IT Support Technician",
  "Junior Software Developer",
  "Key Account Manager",
  "Lab Technician",
  "Legal Secretary",
  "Logistics Coordinator",
  "Machine Operator",
  "Maintenance Manager",
  "Marketing Manager",
  "Mechanical Engineer",
  "Millwright",
  "Mine Overseer",
  "Mining Engineer",
  "Office Administrator",
  "Operations Manager",
  "Payroll Administrator",
  "Pipe Fitter",
  "Plant Manager",
  "Plumber",
  "Procurement Officer",
  "Production Manager",
  "Production Supervisor",
  "Project Manager",
  "Quantity Surveyor",
  "Receptionist",
  "Registered Nurse",
  "Retail Store Manager",
  "Rigger",
  "Sales Consultant",
  "Sales Manager",
  "Security Officer",
  "Site Agent",
  "Site Manager",
  "Software Developer",
  "Stock Controller",
  "Storeman",
  "Supply Chain Manager",
  "Teacher",
  "Technical Sales Representative",
  "Technician",
  "Truck Driver",
  "Warehouse Manager",
  "Welder",
] as const;

export interface SharedWorkFields {
  fields: JobCategoryKey[];
  primaryRole: string | null;
  yearsExperience: number | null;
  availability: Availability | null;
  willingToTravelKm: number | null;
  homeAddress?: string | null;
  homeLatitude?: number | null;
  homeLongitude?: number | null;
  topSkills: string[];
  certifications: string[];
  // Salary expectation (ZAR / year). User override of Nix's CV-derived suggestion;
  // null/absent means "use Nix's suggested band" (ExtractedCvData.suggestedSalary*).
  expectedSalaryMin?: number | null;
  expectedSalaryMax?: number | null;
}

export interface WorkProfile {
  shared: SharedWorkFields;
}

export function emptyWorkProfile(): WorkProfile {
  return {
    shared: {
      fields: [],
      primaryRole: null,
      yearsExperience: null,
      availability: null,
      willingToTravelKm: null,
      homeAddress: null,
      homeLatitude: null,
      homeLongitude: null,
      topSkills: [],
      certifications: [],
      expectedSalaryMin: null,
      expectedSalaryMax: null,
    },
  };
}
