"use client";

import { ExternalLink, HelpCircle, X } from "lucide-react";
import { useState } from "react";

const HELP_LINKS = [
  { label: "SARS eFiling", url: "https://www.sarsefiling.co.za/" },
  { label: "CIPC eServices", url: "https://eservices.cipc.co.za/" },
  { label: "POPIA Information Regulator", url: "https://inforegulator.org.za/" },
  { label: "Department of Labour", url: "https://www.labour.gov.za/" },
  { label: "Compensation Fund (COIDA)", url: "https://www.labour.gov.za/compensation-fund" },
  { label: "B-BBEE Commission", url: "https://www.bbbeecommission.co.za/" },
  { label: "SETA Directory", url: "https://www.dhet.gov.za/SitePages/SETAs.aspx" },
];

export default function HelpLinks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="absolute bottom-14 right-0 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Links</h3>
            <button
              type="button"
              aria-label="Close quick links"
              onClick={() => setOpen(false)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="py-1">
            {HELP_LINKS.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {link.label}
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              </a>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label="Help"
        onClick={() => setOpen(!open)}
        className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          open
            ? "bg-teal-500 text-white"
            : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent"
        }`}
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
