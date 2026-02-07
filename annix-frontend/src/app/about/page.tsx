"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

const Pipe3DPreview = dynamic(() => import("@/app/components/rfq/Pipe3DPreview"), {
  ssr: false,
  loading: () => <PreviewPlaceholder label="Loading Pipe Preview..." />,
});

const CSGBend3DPreview = dynamic(() => import("@/app/components/rfq/CSGBend3DPreview"), {
  ssr: false,
  loading: () => <PreviewPlaceholder label="Loading Bend Preview..." />,
});

const Tee3DPreview = dynamic(() => import("@/app/components/rfq/Tee3DPreview"), {
  ssr: false,
  loading: () => <PreviewPlaceholder label="Loading Tee Preview..." />,
});

function PreviewPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-80 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  );
}

const samplePipeData = {
  length: 2000,
  outerDiameter: 219.1,
  wallThickness: 6.35,
  endConfiguration: "flanged_flanged",
  materialName: "SANS 62",
  nominalBoreMm: 200,
};

const sampleBendData = {
  nominalBore: 150,
  outerDiameter: 168.3,
  wallThickness: 5.4,
  bendAngle: 90,
  bendType: "segmented",
  numberOfSegments: 5,
  tangent1: 150,
  tangent2: 150,
  materialName: "SANS 62",
  isSegmented: true,
  flangeConfig: "flanged_plain",
};

const sampleTeeData = {
  nominalBore: 200,
  outerDiameter: 219.1,
  wallThickness: 6.35,
  teeType: "short" as const,
  branchNominalBore: 100,
  runLength: 1500,
  materialName: "SANS 62",
  hasInletFlange: true,
  hasOutletFlange: true,
  hasBranchFlange: true,
};

export default function AboutPage() {
  const [activePreview, setActivePreview] = useState<"pipe" | "bend" | "tee">("bend");

  useEffect(() => {
    document.title = "About Annix - Industrial Pipeline Quoting Platform";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Industrial Pipeline Quoting,
              <span className="text-orange-400"> Reimagined</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-200 mb-8 leading-relaxed">
              Annix transforms how mining, water, and industrial sectors procure fabricated steel
              pipes. From instant 3D visualizations to automated supplier matching, we streamline
              every step of your RFQ process.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/rfq"
                className="inline-flex items-center px-8 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl text-lg"
              >
                Start Your RFQ
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <Link
                href="/customer/register"
                className="inline-flex items-center px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/30 text-lg"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Preview Showcase */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Interactive 3D Pipe Visualizations
            </h2>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              See your fabricated items in stunning 3D before you order. Rotate, zoom, and inspect
              every detail of your pipes, bends, and fittings.
            </p>
          </div>

          {/* Preview Selector */}
          <div className="flex justify-center gap-4 mb-8">
            {[
              { id: "pipe" as const, label: "Straight Pipe", icon: "|" },
              { id: "bend" as const, label: "Segmented Bend", icon: "/" },
              { id: "tee" as const, label: "Tee Fitting", icon: "T" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePreview(item.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activePreview === item.id
                    ? "bg-orange-500 text-white shadow-lg"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <span className="mr-2 font-mono">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* 3D Preview Container */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 shadow-2xl">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden">
              {activePreview === "pipe" && (
                <Pipe3DPreview
                  length={samplePipeData.length}
                  outerDiameter={samplePipeData.outerDiameter}
                  wallThickness={samplePipeData.wallThickness}
                  endConfiguration={samplePipeData.endConfiguration}
                  materialName={samplePipeData.materialName}
                  nominalBoreMm={samplePipeData.nominalBoreMm}
                />
              )}
              {activePreview === "bend" && (
                <CSGBend3DPreview
                  nominalBore={sampleBendData.nominalBore}
                  outerDiameter={sampleBendData.outerDiameter}
                  wallThickness={sampleBendData.wallThickness}
                  bendAngle={sampleBendData.bendAngle}
                  bendType={sampleBendData.bendType}
                  numberOfSegments={sampleBendData.numberOfSegments}
                  tangent1={sampleBendData.tangent1}
                  tangent2={sampleBendData.tangent2}
                  materialName={sampleBendData.materialName}
                  isSegmented={sampleBendData.isSegmented}
                  flangeConfig={sampleBendData.flangeConfig}
                />
              )}
              {activePreview === "tee" && (
                <Tee3DPreview
                  nominalBore={sampleTeeData.nominalBore}
                  outerDiameter={sampleTeeData.outerDiameter}
                  wallThickness={sampleTeeData.wallThickness}
                  teeType={sampleTeeData.teeType}
                  branchNominalBore={sampleTeeData.branchNominalBore}
                  runLength={sampleTeeData.runLength}
                  materialName={sampleTeeData.materialName}
                  hasInletFlange={sampleTeeData.hasInletFlange}
                  hasOutletFlange={sampleTeeData.hasOutletFlange}
                  hasBranchFlange={sampleTeeData.hasBranchFlange}
                />
              )}
            </div>
            <p className="text-center text-blue-300 text-sm mt-4">
              Click and drag to rotate. Scroll to zoom. Every RFQ item gets its own interactive 3D
              preview.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Powerful Features for Modern Procurement
            </h2>
            <p className="text-blue-200 text-lg">
              Everything you need to streamline your pipeline procurement workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Specifications</h3>
              <p className="text-blue-200">
                Select your pipe type, dimensions, and end configurations. Our system automatically
                calculates weights, welds, and material requirements.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Verified Suppliers</h3>
              <p className="text-blue-200">
                Connect with pre-qualified fabricators and suppliers. Every supplier on our platform
                is verified for quality and capability.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Environmental Intelligence</h3>
              <p className="text-blue-200">
                Our AI analyzes your project location to recommend optimal coating specifications
                based on soil conditions and climate data.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Auto-Calculated Pricing</h3>
              <p className="text-blue-200">
                Get instant pricing estimates based on steel weights, flange counts, weld linear
                meters, and current market rates.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-pink-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Document Management</h3>
              <p className="text-blue-200">
                Upload BOQs, technical drawings, and tender documents. All your project files
                organized in one secure location.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nix AI Assistant</h3>
              <p className="text-blue-200">
                Our intelligent assistant extracts pipe specifications directly from your uploaded
                documents, saving hours of manual data entry.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Types Section */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Complete Product Coverage
            </h2>
            <p className="text-blue-200 text-lg">
              From simple straight pipes to complex fittings, we handle it all
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Steel Pipes", desc: "Fabricated to spec", icon: "|" },
              { name: "Bends", desc: "Segmented & Smooth", icon: "/" },
              { name: "Tees & Laterals", desc: "Custom angles", icon: "T" },
              { name: "Reducers", desc: "Concentric & Eccentric", icon: ">" },
              { name: "Flanges", desc: "All standards", icon: "O" },
              { name: "Surface Protection", desc: "Coatings & Linings", icon: "#" },
              { name: "HDPE Pipes", desc: "PE80 & PE100", icon: "=" },
              { name: "PVC Pipes", desc: "Full range", icon: "-" },
            ].map((product, idx) => (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 text-center hover:bg-white/10 transition-all"
              >
                <div className="text-3xl font-mono text-orange-400 mb-2">{product.icon}</div>
                <h3 className="text-white font-bold">{product.name}</h3>
                <p className="text-blue-300 text-sm">{product.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 bg-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-blue-200 text-lg">Three simple steps to get your quotes</p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Create Your RFQ",
                desc: "Specify your project details, add pipe items with dimensions and end configurations, and upload any supporting documents.",
              },
              {
                step: "02",
                title: "Review & Submit",
                desc: "Preview your items in 3D, verify all specifications, and submit your RFQ to our network of verified suppliers.",
              },
              {
                step: "03",
                title: "Receive Quotes",
                desc: "Compare quotes from multiple suppliers, review pricing breakdowns, and select your preferred fabricator.",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-blue-200">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Procurement?
          </h2>
          <p className="text-xl text-blue-200 mb-8">
            Join hundreds of mining, water, and industrial companies already using Annix to
            streamline their pipeline procurement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/rfq"
              className="inline-flex items-center px-8 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl text-lg"
            >
              Create Your First RFQ
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/customer/register"
              className="inline-flex items-center px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/30 text-lg"
            >
              Register Now
            </Link>
          </div>
          <p className="text-blue-300 text-sm mt-6">
            No credit card required. Start quoting in minutes.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-blue-300 text-sm">
            Annix - Streamlining industrial pipeline procurement across South Africa
          </p>
        </div>
      </div>
    </div>
  );
}
