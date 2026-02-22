"use client";

import React, { useState } from "react";
import { paintProducts } from "@product-data/paint/paintProducts";
import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

type WizardStep = "primer" | "intermediate" | "topcoat" | "review";

interface CoatLayer {
  productId: string | null;
  productName: string | null;
  supplier: string | null;
  dftMicrons: number;
  coats: number;
}

interface SystemBuilderWizardProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
  onClose: () => void;
  target: "external" | "internal";
}

const PRIMER_PRODUCTS = paintProducts.filter(
  (p) =>
    p.genericType.toLowerCase().includes("primer") || p.genericType.toLowerCase().includes("zinc"),
);

const INTERMEDIATE_PRODUCTS = paintProducts.filter(
  (p) =>
    p.genericType.toLowerCase().includes("epoxy") ||
    p.genericType.toLowerCase().includes("intermediate") ||
    p.genericType.toLowerCase().includes("mio"),
);

const TOPCOAT_PRODUCTS = paintProducts.filter(
  (p) =>
    p.genericType.toLowerCase().includes("polyurethane") ||
    p.genericType.toLowerCase().includes("topcoat") ||
    p.genericType.toLowerCase().includes("finish") ||
    p.genericType.toLowerCase().includes("acrylic"),
);

export function SystemBuilderWizard({
  globalSpecs,
  onUpdateGlobalSpecs,
  onClose,
  target,
}: SystemBuilderWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("primer");
  const [primer, setPrimer] = useState<CoatLayer>({
    productId: null,
    productName: null,
    supplier: null,
    dftMicrons: 75,
    coats: 1,
  });
  const [intermediate, setIntermediate] = useState<CoatLayer>({
    productId: null,
    productName: null,
    supplier: null,
    dftMicrons: 150,
    coats: 1,
  });
  const [topcoat, setTopcoat] = useState<CoatLayer>({
    productId: null,
    productName: null,
    supplier: null,
    dftMicrons: 50,
    coats: 1,
  });

  const steps: WizardStep[] = ["primer", "intermediate", "topcoat", "review"];
  const stepIndex = steps.indexOf(currentStep);

  const totalDft =
    primer.dftMicrons * primer.coats +
    intermediate.dftMicrons * intermediate.coats +
    topcoat.dftMicrons * topcoat.coats;

  const handleProductSelect = (
    product: (typeof paintProducts)[0],
    layer: "primer" | "intermediate" | "topcoat",
  ) => {
    const layerData = {
      productId: product.id,
      productName: product.name,
      supplier: product.supplier,
      dftMicrons: product.dft.typicalUm,
      coats: 1,
    };

    switch (layer) {
      case "primer":
        setPrimer(layerData);
        break;
      case "intermediate":
        setIntermediate(layerData);
        break;
      case "topcoat":
        setTopcoat(layerData);
        break;
    }
  };

  const handleApplySystem = () => {
    const prefix = target === "external" ? "external" : "internal";
    onUpdateGlobalSpecs({
      ...globalSpecs,
      [`${prefix}PrimerType`]: primer.productName,
      [`${prefix}PrimerMicrons`]: primer.dftMicrons * primer.coats,
      [`${prefix}IntermediateType`]: intermediate.productName,
      [`${prefix}IntermediateMicrons`]: intermediate.dftMicrons * intermediate.coats,
      [`${prefix}TopcoatType`]: topcoat.productName,
      [`${prefix}TopcoatMicrons`]: topcoat.dftMicrons * topcoat.coats,
      [`${prefix}CoatingType`]: "Paint",
    });
    onClose();
  };

  const renderProductList = (
    products: typeof paintProducts,
    layer: "primer" | "intermediate" | "topcoat",
    selectedId: string | null,
  ) => (
    <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium text-gray-600">Product</th>
            <th className="px-2 py-1.5 text-left font-medium text-gray-600">Supplier</th>
            <th className="px-2 py-1.5 text-left font-medium text-gray-600">Rec. DFT</th>
            <th className="px-2 py-1.5 text-center font-medium text-gray-600">Select</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((product) => (
            <tr
              key={product.id}
              className={`hover:bg-gray-50 cursor-pointer ${
                selectedId === product.id ? "bg-blue-50" : ""
              }`}
              onClick={() => handleProductSelect(product, layer)}
            >
              <td className="px-2 py-2">
                <div className="font-medium text-gray-900">{product.name}</div>
                <div className="text-gray-500 text-[10px]">{product.genericType}</div>
              </td>
              <td className="px-2 py-2 text-gray-700">{product.supplier}</td>
              <td className="px-2 py-2 text-gray-700">{product.dft.typicalUm}um</td>
              <td className="px-2 py-2 text-center">
                {selectedId === product.id ? (
                  <svg
                    className="w-4 h-4 text-green-600 mx-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <div className="w-4 h-4 border border-gray-300 rounded mx-auto" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDftAdjuster = (
    layer: CoatLayer,
    setLayer: React.Dispatch<React.SetStateAction<CoatLayer>>,
  ) => (
    <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-gray-50 rounded">
      <div>
        <label className="block text-[10px] font-medium text-gray-600 mb-1">
          DFT per Coat (microns)
        </label>
        <input
          type="number"
          value={layer.dftMicrons}
          onChange={(e) => setLayer({ ...layer, dftMicrons: parseInt(e.target.value, 10) || 0 })}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-gray-600 mb-1">Number of Coats</label>
        <select
          value={layer.coats}
          onChange={(e) => setLayer({ ...layer, coats: parseInt(e.target.value, 10) })}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
        >
          <option value={1}>1 coat</option>
          <option value={2}>2 coats</option>
          <option value={3}>3 coats</option>
        </select>
      </div>
      <div className="col-span-2 text-xs text-gray-600">
        <strong>Total for layer:</strong> {layer.dftMicrons * layer.coats}um
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Coating System Builder - {target === "external" ? "External" : "Internal"}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div
                key={step}
                className={`flex items-center ${idx < steps.length - 1 ? "flex-1" : ""}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    idx <= stepIndex ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`ml-2 text-xs font-medium capitalize ${
                    idx <= stepIndex ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  {step}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      idx < stepIndex ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {currentStep === "primer" && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Step 1: Select Primer</h4>
              <p className="text-xs text-gray-600 mb-3">
                Choose a primer for the first coat. Primers provide adhesion and corrosion
                protection.
              </p>
              {renderProductList(PRIMER_PRODUCTS, "primer", primer.productId)}
              {primer.productId && renderDftAdjuster(primer, setPrimer)}
            </div>
          )}

          {currentStep === "intermediate" && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Step 2: Select Intermediate Coat
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                Choose an intermediate coat for barrier protection and build.
              </p>
              {renderProductList(INTERMEDIATE_PRODUCTS, "intermediate", intermediate.productId)}
              {intermediate.productId && renderDftAdjuster(intermediate, setIntermediate)}
              <div className="mt-2 text-xs text-gray-500">
                <button
                  type="button"
                  onClick={() => setCurrentStep("topcoat")}
                  className="text-blue-600 hover:underline"
                >
                  Skip intermediate coat
                </button>
              </div>
            </div>
          )}

          {currentStep === "topcoat" && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Step 3: Select Topcoat</h4>
              <p className="text-xs text-gray-600 mb-3">
                Choose a topcoat for UV protection, aesthetics, and final barrier.
              </p>
              {renderProductList(TOPCOAT_PRODUCTS, "topcoat", topcoat.productId)}
              {topcoat.productId && renderDftAdjuster(topcoat, setTopcoat)}
            </div>
          )}

          {currentStep === "review" && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Step 4: Review System</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {/* Primer */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <div>
                    <div className="text-xs font-medium text-gray-500">PRIMER</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {primer.productName || "Not selected"}
                    </div>
                    {primer.supplier && (
                      <div className="text-xs text-gray-500">{primer.supplier}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {primer.dftMicrons * primer.coats}um
                    </div>
                    <div className="text-xs text-gray-500">
                      {primer.coats} coat{primer.coats > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Intermediate */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <div>
                    <div className="text-xs font-medium text-gray-500">INTERMEDIATE</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {intermediate.productName || "Not selected"}
                    </div>
                    {intermediate.supplier && (
                      <div className="text-xs text-gray-500">{intermediate.supplier}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {intermediate.dftMicrons * intermediate.coats}um
                    </div>
                    <div className="text-xs text-gray-500">
                      {intermediate.coats} coat{intermediate.coats > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Topcoat */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <div>
                    <div className="text-xs font-medium text-gray-500">TOPCOAT</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {topcoat.productName || "Not selected"}
                    </div>
                    {topcoat.supplier && (
                      <div className="text-xs text-gray-500">{topcoat.supplier}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {topcoat.dftMicrons * topcoat.coats}um
                    </div>
                    <div className="text-xs text-gray-500">
                      {topcoat.coats} coat{topcoat.coats > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-2 bg-blue-50 rounded px-2">
                  <div className="text-sm font-bold text-blue-900">TOTAL SYSTEM DFT</div>
                  <div className="text-lg font-bold text-blue-900">{totalDft}um</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const idx = steps.indexOf(currentStep);
              if (idx > 0) setCurrentStep(steps[idx - 1]);
            }}
            disabled={currentStep === "primer"}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            {currentStep === "review" ? (
              <button
                type="button"
                onClick={handleApplySystem}
                className="px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
              >
                Apply System
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const idx = steps.indexOf(currentStep);
                  if (idx < steps.length - 1) setCurrentStep(steps[idx + 1]);
                }}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
