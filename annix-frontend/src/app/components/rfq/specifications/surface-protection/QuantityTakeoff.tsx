"use client";

import { useMemo, useState } from "react";

interface QuantityTakeoffProps {
  surfaceAreaM2: number;
  coatingType: "paint" | "rubber" | "ceramic";
  systemDetails?: {
    primerDftMicrons?: number;
    intermediateDftMicrons?: number;
    topcoatDftMicrons?: number;
    rubberThicknessMm?: number;
    ceramicTileSizeMm?: { width: number; height: number };
    ceramicThicknessMm?: number;
  };
}

interface MaterialQuantity {
  material: string;
  unit: string;
  quantity: number;
  theoreticalCoverage: string;
  wastagePercent: number;
  quantityWithWastage: number;
  notes?: string;
}

const PAINT_THEORETICAL_COVERAGE = {
  primer: { m2PerLiter: 8, dftMicrons: 75 },
  intermediate: { m2PerLiter: 6, dftMicrons: 150 },
  topcoat: { m2PerLiter: 10, dftMicrons: 50 },
  thinner: { percentOfPaint: 10 },
};

const RUBBER_COVERAGE = {
  sheetWidthM: 1.2,
  wastagePercent: 15,
  adhesiveKgPerM2: 0.5,
};

const CERAMIC_COVERAGE = {
  tilesPerM2: (width: number, height: number) => Math.ceil(1000000 / (width * height)),
  groutKgPerM2: 2.5,
  adhesiveKgPerM2: 4.0,
  wastagePercent: 10,
};

export function QuantityTakeoff({
  surfaceAreaM2,
  coatingType,
  systemDetails = {},
}: QuantityTakeoffProps) {
  const [customWastage, setCustomWastage] = useState<Record<string, number>>({});

  const quantities = useMemo((): MaterialQuantity[] => {
    const items: MaterialQuantity[] = [];

    switch (coatingType) {
      case "paint": {
        const primerDft =
          systemDetails.primerDftMicrons || PAINT_THEORETICAL_COVERAGE.primer.dftMicrons;
        const intermediateDft =
          systemDetails.intermediateDftMicrons ||
          PAINT_THEORETICAL_COVERAGE.intermediate.dftMicrons;
        const topcoatDft =
          systemDetails.topcoatDftMicrons || PAINT_THEORETICAL_COVERAGE.topcoat.dftMicrons;

        const primerLiters =
          (surfaceAreaM2 * primerDft) /
          (PAINT_THEORETICAL_COVERAGE.primer.m2PerLiter *
            PAINT_THEORETICAL_COVERAGE.primer.dftMicrons);
        const intermediateLiters =
          (surfaceAreaM2 * intermediateDft) /
          (PAINT_THEORETICAL_COVERAGE.intermediate.m2PerLiter *
            PAINT_THEORETICAL_COVERAGE.intermediate.dftMicrons);
        const topcoatLiters =
          (surfaceAreaM2 * topcoatDft) /
          (PAINT_THEORETICAL_COVERAGE.topcoat.m2PerLiter *
            PAINT_THEORETICAL_COVERAGE.topcoat.dftMicrons);

        items.push({
          material: "Primer",
          unit: "liters",
          quantity: Math.round(primerLiters * 10) / 10,
          theoreticalCoverage: `${PAINT_THEORETICAL_COVERAGE.primer.m2PerLiter} m2/L @ ${PAINT_THEORETICAL_COVERAGE.primer.dftMicrons}um`,
          wastagePercent: customWastage.primer ?? 15,
          quantityWithWastage: Math.ceil(primerLiters * (1 + (customWastage.primer ?? 15) / 100)),
          notes: `Target DFT: ${primerDft}um`,
        });

        items.push({
          material: "Intermediate Coat",
          unit: "liters",
          quantity: Math.round(intermediateLiters * 10) / 10,
          theoreticalCoverage: `${PAINT_THEORETICAL_COVERAGE.intermediate.m2PerLiter} m2/L @ ${PAINT_THEORETICAL_COVERAGE.intermediate.dftMicrons}um`,
          wastagePercent: customWastage.intermediate ?? 15,
          quantityWithWastage: Math.ceil(
            intermediateLiters * (1 + (customWastage.intermediate ?? 15) / 100),
          ),
          notes: `Target DFT: ${intermediateDft}um`,
        });

        items.push({
          material: "Topcoat",
          unit: "liters",
          quantity: Math.round(topcoatLiters * 10) / 10,
          theoreticalCoverage: `${PAINT_THEORETICAL_COVERAGE.topcoat.m2PerLiter} m2/L @ ${PAINT_THEORETICAL_COVERAGE.topcoat.dftMicrons}um`,
          wastagePercent: customWastage.topcoat ?? 15,
          quantityWithWastage: Math.ceil(topcoatLiters * (1 + (customWastage.topcoat ?? 15) / 100)),
          notes: `Target DFT: ${topcoatDft}um`,
        });

        const totalPaintLiters = primerLiters + intermediateLiters + topcoatLiters;
        const thinnerLiters =
          totalPaintLiters * (PAINT_THEORETICAL_COVERAGE.thinner.percentOfPaint / 100);

        items.push({
          material: "Thinner/Reducer",
          unit: "liters",
          quantity: Math.round(thinnerLiters * 10) / 10,
          theoreticalCoverage: `${PAINT_THEORETICAL_COVERAGE.thinner.percentOfPaint}% of paint volume`,
          wastagePercent: 0,
          quantityWithWastage: Math.ceil(thinnerLiters),
          notes: "For cleaning and viscosity adjustment",
        });

        break;
      }

      case "rubber": {
        const thicknessMm = systemDetails.rubberThicknessMm || 6;
        const sheetAreaM2 = surfaceAreaM2 * (1 + RUBBER_COVERAGE.wastagePercent / 100);
        const linearMeters = sheetAreaM2 / RUBBER_COVERAGE.sheetWidthM;

        items.push({
          material: "Rubber Sheet",
          unit: "m2",
          quantity: Math.round(surfaceAreaM2 * 10) / 10,
          theoreticalCoverage: `${thicknessMm}mm thickness`,
          wastagePercent: customWastage.rubber ?? RUBBER_COVERAGE.wastagePercent,
          quantityWithWastage: Math.ceil(
            surfaceAreaM2 * (1 + (customWastage.rubber ?? RUBBER_COVERAGE.wastagePercent) / 100),
          ),
          notes: `Sheet width: ${RUBBER_COVERAGE.sheetWidthM}m, Linear: ${Math.ceil(linearMeters)}m`,
        });

        items.push({
          material: "Bonding Adhesive",
          unit: "kg",
          quantity: Math.round(surfaceAreaM2 * RUBBER_COVERAGE.adhesiveKgPerM2 * 10) / 10,
          theoreticalCoverage: `${RUBBER_COVERAGE.adhesiveKgPerM2} kg/m2`,
          wastagePercent: customWastage.adhesive ?? 10,
          quantityWithWastage: Math.ceil(
            surfaceAreaM2 *
              RUBBER_COVERAGE.adhesiveKgPerM2 *
              (1 + (customWastage.adhesive ?? 10) / 100),
          ),
          notes: "Two-part adhesive system",
        });

        break;
      }

      case "ceramic": {
        const tileWidth = systemDetails.ceramicTileSizeMm?.width || 50;
        const tileHeight = systemDetails.ceramicTileSizeMm?.height || 50;
        const tilesPerM2 = CERAMIC_COVERAGE.tilesPerM2(tileWidth, tileHeight);
        const totalTiles = surfaceAreaM2 * tilesPerM2;

        items.push({
          material: "Ceramic Tiles",
          unit: "pieces",
          quantity: Math.ceil(totalTiles),
          theoreticalCoverage: `${tilesPerM2} tiles/m2 (${tileWidth}x${tileHeight}mm)`,
          wastagePercent: customWastage.tiles ?? CERAMIC_COVERAGE.wastagePercent,
          quantityWithWastage: Math.ceil(
            totalTiles * (1 + (customWastage.tiles ?? CERAMIC_COVERAGE.wastagePercent) / 100),
          ),
          notes: `Thickness: ${systemDetails.ceramicThicknessMm || 12}mm`,
        });

        items.push({
          material: "Ceramic Adhesive",
          unit: "kg",
          quantity: Math.round(surfaceAreaM2 * CERAMIC_COVERAGE.adhesiveKgPerM2 * 10) / 10,
          theoreticalCoverage: `${CERAMIC_COVERAGE.adhesiveKgPerM2} kg/m2`,
          wastagePercent: customWastage.ceramicAdhesive ?? 10,
          quantityWithWastage: Math.ceil(
            surfaceAreaM2 *
              CERAMIC_COVERAGE.adhesiveKgPerM2 *
              (1 + (customWastage.ceramicAdhesive ?? 10) / 100),
          ),
          notes: "Epoxy or ceramic cement",
        });

        items.push({
          material: "Grout",
          unit: "kg",
          quantity: Math.round(surfaceAreaM2 * CERAMIC_COVERAGE.groutKgPerM2 * 10) / 10,
          theoreticalCoverage: `${CERAMIC_COVERAGE.groutKgPerM2} kg/m2`,
          wastagePercent: customWastage.grout ?? 10,
          quantityWithWastage: Math.ceil(
            surfaceAreaM2 * CERAMIC_COVERAGE.groutKgPerM2 * (1 + (customWastage.grout ?? 10) / 100),
          ),
          notes: "Epoxy or cementitious grout",
        });

        break;
      }
    }

    return items;
  }, [surfaceAreaM2, coatingType, systemDetails, customWastage]);

  const updateWastage = (material: string, value: number) => {
    setCustomWastage((prev) => ({
      ...prev,
      [material.toLowerCase().replace(/\s+/g, "")]: value,
    }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Quantity Takeoff
        </h3>
        <span className="text-xs text-gray-500">Surface Area: {surfaceAreaM2.toFixed(2)} m2</span>
      </div>

      {/* Summary */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <div className="text-xs font-medium text-blue-900">
          Material Type: <span className="font-bold capitalize">{coatingType}</span>
        </div>
      </div>

      {/* Quantities Table */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-gray-600">Material</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">Theoretical</th>
              <th className="px-2 py-1.5 text-center font-medium text-gray-600">Wastage %</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">Order Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quantities.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-2">
                  <div className="font-medium text-gray-900">{item.material}</div>
                  <div className="text-[10px] text-gray-500">{item.theoreticalCoverage}</div>
                  {item.notes && <div className="text-[10px] text-gray-400">{item.notes}</div>}
                </td>
                <td className="px-2 py-2 text-right text-gray-700">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="number"
                    value={item.wastagePercent}
                    onChange={(e) =>
                      updateWastage(item.material, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-12 px-1 py-0.5 text-center text-xs border border-gray-300 rounded"
                  />
                </td>
                <td className="px-2 py-2 text-right font-semibold text-gray-900">
                  {item.quantityWithWastage} {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export Button */}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            const csv = [
              ["Material", "Unit", "Theoretical", "Wastage %", "Order Qty"],
              ...quantities.map((q) => [
                q.material,
                q.unit,
                q.quantity,
                q.wastagePercent,
                q.quantityWithWastage,
              ]),
            ]
              .map((row) => row.join(","))
              .join("\n");

            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "quantity-takeoff.csv";
            a.click();
          }}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
