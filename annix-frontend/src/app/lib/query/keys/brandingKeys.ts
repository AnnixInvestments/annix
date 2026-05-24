export const brandingKeys = {
  all: ["branding"] as const,
  public: (brand: string) => ["branding", "public", brand] as const,
  admin: (brand: string) => ["branding", "admin", brand] as const,
  images: (brand: string) => ["branding", "images", brand] as const,
};
