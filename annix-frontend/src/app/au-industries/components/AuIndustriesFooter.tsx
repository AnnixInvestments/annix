"use client";

import Link from "next/link";

interface FooterProps {
  companyName: string;
  phone: string;
  email: string;
  address: string;
}

export function AuIndustriesFooter(props: FooterProps) {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">{props.companyName}</h3>
            <p className="text-sm leading-relaxed">{props.address}</p>
          </div>
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-sm">
              <p>
                <a href={`tel:${props.phone}`} className="hover:text-white transition-colors">
                  {props.phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${props.email}`} className="hover:text-white transition-colors">
                  {props.email}
                </a>
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2 text-sm">
              <Link href="/au-industries" className="block hover:text-white transition-colors">
                Home
              </Link>
              <Link
                href="/au-industries/contact"
                className="block hover:text-white transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          <p>
            &copy; {new Date().getFullYear()} {props.companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
