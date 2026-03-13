"use client";

interface HeroBannerProps {
  userName: string | null;
  heroImageUrl: string | null;
  backgroundColor: string;
}

export function HeroBanner({ userName, heroImageUrl, backgroundColor }: HeroBannerProps) {
  const greeting = userName ? userName.split(" ")[0] : "there";

  if (heroImageUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ minHeight: 100 }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="relative px-4 py-5 sm:px-8 sm:py-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome back, {greeting}</h1>
          <p className="mt-1 text-white/80 text-xs sm:text-sm">Workflow overview</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-lg"
      style={{ backgroundColor, minHeight: 80 }}
    >
      <div className="relative px-4 py-4 sm:px-8 sm:py-6">
        <h1 className="text-lg sm:text-2xl font-bold text-white">Welcome back, {greeting}</h1>
        <p className="mt-1 text-white/80 text-xs sm:text-sm">Workflow overview</p>
      </div>
    </div>
  );
}
