export interface IngestedJobResult {
  id: string;
  title: string;
  company: string | null;
  description: string | null;
  locationDisplayName: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  category: string | null;
  redirectUrl: string | null;
  created: string | null;
}
