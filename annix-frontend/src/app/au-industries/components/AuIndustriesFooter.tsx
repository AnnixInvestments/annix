"use client";

import Image from "next/image";
import Link from "next/link";
import { now } from "@/app/lib/datetime";

interface FooterProps {
  companyName: string;
  phone: string;
  email: string;
  address: string;
}

export function AuIndustriesFooter(props: FooterProps) {
  return (
    <footer className="bg-white text-gray-900 border-t-4 border-[#B8860B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image
              src="/au-industries/logo.jpg"
              alt="AU Industries"
              width={140}
              height={70}
              className="h-14 w-auto mb-4"
            />
            <p className="text-sm leading-relaxed text-gray-700">{props.address}</p>
          </div>
          <div>
            <h3 className="text-gray-900 text-lg font-semibold mb-4 uppercase tracking-wide">
              Contact
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <a
                  href={`tel:${props.phone}`}
                  className="text-gray-700 hover:text-[#B8860B] underline-offset-2 hover:underline transition-colors"
                >
                  {props.phone}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${props.email}`}
                  className="text-gray-700 hover:text-[#B8860B] underline-offset-2 hover:underline transition-colors"
                >
                  {props.email}
                </a>
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-gray-900 text-lg font-semibold mb-4 uppercase tracking-wide">
              Quick Links
            </h3>
            <div className="space-y-2 text-sm">
              <Link
                href="/"
                className="block text-gray-700 hover:text-[#B8860B] underline-offset-2 hover:underline transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products-and-services"
                className="block text-gray-700 hover:text-[#B8860B] underline-offset-2 hover:underline transition-colors"
              >
                Products & Services
              </Link>
              <Link
                href="/gallery"
                className="block text-gray-700 hover:text-[#B8860B] underline-offset-2 hover:underline transition-colors"
              >
                Gallery
              </Link>
              <Link
                href="/contact"
                className="block text-gray-700 hover:text-[#B8860B] underline-offset-2 hover:underline transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            &copy; {now().year} {props.companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
