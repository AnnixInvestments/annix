"use client";

import { useEffect, useState } from "react";
import { browserBaseUrl } from "@/lib/api-config";

interface CompanyProfile {
  tradingName: string;
  phone: string;
  generalEmail: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
}

export default function AuIndustriesContactPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [enquiryType, setEnquiryType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Contact Us | AU Industries";
    const base = browserBaseUrl();
    fetch(`${base}/public/au-industries/contact`)
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const base = browserBaseUrl();
      const fullMessage = enquiryType ? `[${enquiryType}]\n\n${message}` : message;
      const res = await fetch(`${base}/public/au-industries/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message: fullMessage }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setSubmitted(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setEnquiryType("");
    } catch {
      setError("Failed to send your message. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const enquiryOptions = [
    "Rubber compound or Sheeting",
    "Other Rubber products",
    "Full Mining Projects",
    "Replacement and spares",
    "Pumps and Valves",
    "Site and Maintenance",
    "HDPE & PVC piping",
    "Structural steel work",
    "All other Queries",
  ];

  return (
    <div>
      <section className="bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider">
            Contact Us
          </h1>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-[#B8860B] uppercase tracking-wide mb-6">
                Need More Information?
              </h2>
              <p className="text-gray-600 mb-8">
                Please fill in and submit the form to request a quote or get more information about
                any of our services and products.
              </p>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-green-800 mb-2">Message Sent</h3>
                  <p className="text-green-700">
                    Thank you for your enquiry. We will get back to you as soon as possible.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 text-sm text-[#B8860B] hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      I am enquiring about:
                    </label>
                    <select
                      value={enquiryType}
                      onChange={(e) => setEnquiryType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:ring-2 focus:ring-[#B8860B] focus:border-[#B8860B]"
                    >
                      <option value="">Select an option...</option>
                      {enquiryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#B8860B] focus:border-[#B8860B]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#B8860B] focus:border-[#B8860B]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#B8860B] focus:border-[#B8860B]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#B8860B] focus:border-[#B8860B]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-4 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[#B8860B] uppercase tracking-wide mb-6">
                  Contact Details
                </h2>
                {profile && (
                  <div className="space-y-4 text-gray-600">
                    <div className="flex items-start space-x-3">
                      <svg
                        className="w-5 h-5 text-[#B8860B] mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <p>
                        {profile.streetAddress}, {profile.city}, {profile.province}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <svg
                        className="w-5 h-5 text-[#B8860B] flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <a
                        href={`tel:${profile.phone}`}
                        className="hover:text-[#B8860B] transition-colors"
                      >
                        {profile.phone}
                      </a>
                    </div>
                    <div className="flex items-center space-x-3">
                      <svg
                        className="w-5 h-5 text-[#B8860B] flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <a
                        href={`mailto:${profile.generalEmail}`}
                        className="hover:text-[#B8860B] transition-colors"
                      >
                        {profile.generalEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#B8860B] uppercase tracking-wide mb-3">
                  Business Hours
                </h3>
                <p className="text-gray-600">Monday - Friday: 8:00 AM - 5:00 PM</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#B8860B] uppercase tracking-wide mb-3">
                  Visit Us
                </h3>
                <iframe
                  title="AU Industries Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3580.5!2d28.2536!3d-26.2125!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDEyJzQ1LjAiUyAyOMKwMTUnMTMuMCJF!5e0!3m2!1sen!2sza!4v1"
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
