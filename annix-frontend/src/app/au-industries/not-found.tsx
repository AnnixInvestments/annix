import Link from "next/link";

export default function AuIndustriesNotFound() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#B8860B] mb-4">
          Error 404
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 uppercase tracking-wide mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-10">
          The page you are looking for has moved or no longer exists. Explore our products and
          services or get in touch and we will point you in the right direction.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/products-and-services"
            className="inline-block px-10 py-3 bg-[#8A6608] text-white font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors"
          >
            Products &amp; Services
          </Link>
          <Link
            href="/contact"
            className="inline-block px-10 py-3 border-2 border-[#8A6608] text-[#8A6608] font-semibold uppercase tracking-wider hover:bg-[#8A6608] hover:text-white transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}
