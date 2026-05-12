// Catalogue / brochure sources for PVC pipe + fittings data tables.
// Mirrors the HDPE `fitting-dimension-sources.ts` registry pattern.
//
// LEGAL: Annix does NOT hold reproduction rights for SANS 966-1/-2/-3,
// SANS 1601, or SANS 1808 (same posture as the ASME standards — see
// MEMORY.md / legal_sans_pvc_reproduction_rights.md). All embedded
// tables in `packages/product-data/pvc/*` MUST come from manufacturer
// catalogues (Flo-Tek, Marley, Macneil, Sizabantu, Agrico, DPI), with
// the row's `sourceId` pointing at one of these entries. Reference
// SANS by name/clause freely; do NOT copy SANS tables verbatim.

export interface PvcCatalogueSource {
  id: string;
  manufacturer: string;
  catalogueName: string;
  url: string;
  retrievedDate?: string;
  notes?: string;
}

export const PVC_CATALOGUE_SOURCES: PvcCatalogueSource[] = [
  {
    id: "flo-tek-upvc-pressure",
    manufacturer: "Flo-Tek",
    catalogueName: "PVC Pressure Brochure",
    url: "https://www.flotekafrica.com/wp-content/uploads/2020/09/PVC-Presssure-Brochure.pdf",
    retrievedDate: "2026-05-12",
    notes: "Primary uPVC pressure-pipe source for DN 20–500.",
  },
  {
    id: "flo-tek-pvc-o-pressure",
    manufacturer: "Flo-Tek",
    catalogueName: "PVC-O Pressure Pipe Systems",
    url: "https://www.flotekafrica.com/wp-content/uploads/2024/08/Flo-Tek-PVC-O-Pressure-Pipe-Systems.pdf",
    retrievedDate: "2026-05-12",
    notes: "PVC-O ratings PN 12 / 16 / 20 / 25.",
  },
  {
    id: "marley-product-catalogue",
    manufacturer: "Marley Pipe Systems",
    catalogueName: "Product Catalogue Brochure",
    url: "https://marleypipesystems.co.za/wp-content/uploads/2019/11/marley-product-catalogue-brochure-digital.pdf",
    retrievedDate: "2026-05-12",
    notes: "Full uPVC + mPVC + fittings range.",
  },
  {
    id: "marley-technical-downloads",
    manufacturer: "Marley Pipe Systems",
    catalogueName: "Technical Information Downloads",
    url: "https://marleypipesystems.co.za/technical-information-downloads/",
    retrievedDate: "2026-05-12",
    notes: "Index of technical PDFs.",
  },
  {
    id: "macneil-2025-catalogue",
    manufacturer: "Macneil Plastics",
    catalogueName: "A5 Catalogue June 2025",
    url: "https://macneilplastics.co.za/wp-content/uploads/2025/07/Macneil-Plastics-A5-Catalogue-pages-June-2025.pdf",
    retrievedDate: "2026-05-12",
    notes: "uPVC + mPVC pressure, fittings, irrigation.",
  },
  {
    id: "sizabantu-upvc",
    manufacturer: "Sizabantu Piping Systems",
    catalogueName: "uPVC Product Range",
    url: "https://sizabantu.com/upvc/",
    retrievedDate: "2026-05-12",
  },
  {
    id: "sizabantu-mpvc",
    manufacturer: "Sizabantu Piping Systems",
    catalogueName: "mPVC Product Range",
    url: "https://sizabantu.com/mpvc/",
    retrievedDate: "2026-05-12",
  },
  {
    id: "agrico-pvc-2024",
    manufacturer: "Agrico",
    catalogueName: "PVC Catalogue 2024",
    url: "https://agrico.co.za/wp-content/uploads/2024/10/PVC-CATALOGUE-2024_DIGITAL-2.pdf",
    retrievedDate: "2026-05-12",
    notes: "Irrigation-focused PVC range.",
  },
  {
    id: "dpi-trading-pvc",
    manufacturer: "DPI Trading",
    catalogueName: "PVC Pipe & Fittings",
    url: "https://www.dpitrading.co.za/PVC_PIPE_Fittings/",
    retrievedDate: "2026-05-12",
    notes: "Fittings catalogue for SANS 1601 range.",
  },
];

export const pvcCatalogueSource = (id: string): PvcCatalogueSource | null =>
  PVC_CATALOGUE_SOURCES.find((s) => s.id === id) ?? null;
