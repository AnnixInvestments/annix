import { memo } from "react";

interface InternalRubberLinedOptionsProps {
  sansType: number | null | undefined;
  grade: string | null | undefined;
  hardness: number | null | undefined;
  thickness: number | null | undefined;
  vulcanizationMethod: string | null | undefined;
  colour: string | null | undefined;
  chemicalExposure: string[] | null | undefined;
  specialProperties: number[] | null | undefined;
  globalSpecs: Record<string, unknown>;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
}

const InternalRubberLinedOptionsInner = (props: InternalRubberLinedOptionsProps) => {
  const rawSansType = props.sansType;
  const rawGrade = props.grade;
  const rawHardness = props.hardness;
  const rawThickness = props.thickness;
  const rawVulcanizationMethod = props.vulcanizationMethod;
  const rawColour = props.colour;
  const rawChemicalExposure = props.chemicalExposure;
  const rawSpecialProperties = props.specialProperties;
  const globalSpecs = props.globalSpecs;
  const onUpdateGlobalSpecs = props.onUpdateGlobalSpecs;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-800 mb-2">
        Internal Rubber Lining Specifications (SANS 1198:2013)
      </h4>

      {/* Row 1: SANS Type and Grade */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">SANS Type</label>
          <select
            value={rawSansType || ""}
            onChange={(e) => {
              const sansType = e.target.value ? Number(e.target.value) : null;
              const typeMap: Record<number, string> = {
                1: "Natural Rubber",
                2: "Bromobutyl Rubber",
                3: "Nitrile Rubber (NBR)",
                4: "Neoprene (CR)",
                5: "Hypalon (CSM)",
              };
              onUpdateGlobalSpecs({
                ...globalSpecs,
                internalRubberSansType: sansType,
                internalRubberType: sansType ? typeMap[sansType] : null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            <option value="1">Type 1 - NR/SBR (General purpose)</option>
            <option value="2">Type 2 - IIR/Butyl (Chemical resistant)</option>
            <option value="3">Type 3 - NBR/Nitrile (Oil resistant)</option>
            <option value="4">Type 4 - CR/Neoprene (Weather resistant)</option>
            <option value="5">Type 5 - CSM/Hypalon (Acid/ozone resistant)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Grade (Tensile Strength)
          </label>
          <select
            value={rawGrade || ""}
            onChange={(e) => {
              const rawValue40 = e.target.value;

              return onUpdateGlobalSpecs({
                ...globalSpecs,
                internalRubberGrade: rawValue40 || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            <option value="A">Grade A - High Strength (18+ MPa)</option>
            <option value="B">Grade B - Standard (14+ MPa)</option>
            <option value="C">Grade C - Economy (7+ MPa)</option>
            <option value="D">Grade D - Ebonite (Hard rubber)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Hardness Class (IRHD)
          </label>
          <select
            value={rawHardness || ""}
            onChange={(e) =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                internalRubberHardness: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            <option value="40">40 IRHD - Soft (High flexibility)</option>
            <option value="50">50 IRHD - Medium-Soft (General)</option>
            <option value="60">60 IRHD - Medium-Hard (Abrasion)</option>
            <option value="70">70 IRHD - Hard (High abrasion)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
          <select
            value={rawThickness || ""}
            onChange={(e) =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                internalRubberThickness: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            <option value="3">3mm (Min 1 ply)</option>
            <option value="4">4mm (Min 1 ply)</option>
            <option value="5">5mm (Min 2 plies)</option>
            <option value="6">6mm (Min 2 plies)</option>
            <option value="8">8mm (Min 2 plies)</option>
            <option value="10">10mm (Min 2 plies)</option>
            <option value="12">12mm (Min 3 plies)</option>
            <option value="15">15mm (Min 3 plies)</option>
            <option value="20">20mm (Min 4 plies)</option>
          </select>
        </div>
      </div>

      {/* Row 2: Vulcanization, Colour */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Vulcanization Method
          </label>
          <select
            value={rawVulcanizationMethod || ""}
            onChange={(e) => {
              const rawValue41 = e.target.value;

              return onUpdateGlobalSpecs({
                ...globalSpecs,
                internalRubberVulcanizationMethod: rawValue41 || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            <option value="autoclave">Autoclave (Preferred)</option>
            <option value="open">Open Steam</option>
            <option value="hot_water">Hot Water</option>
            <option value="chemical">Chemical/Self-cure</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Colour</label>
          <select
            value={rawColour || ""}
            onChange={(e) => {
              const rawValue42 = e.target.value;

              return onUpdateGlobalSpecs({
                ...globalSpecs,
                internalRubberColour: rawValue42 || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            <option value="Black">Black</option>
            <option value="Red">Red</option>
            <option value="Natural (Tan)">Natural (Tan)</option>
            <option value="Grey">Grey</option>
            <option value="Green">Green</option>
            <option value="Blue">Blue</option>
            <option value="White">White</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Chemical Exposure
          </label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                const current = rawChemicalExposure || [];
                if (!current.includes(e.target.value)) {
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalRubberChemicalExposure: [...current, e.target.value],
                  });
                }
              }
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Add chemical exposure...</option>
            <option value="acids_inorganic">Inorganic Acids (H2SO4, HCl)</option>
            <option value="acids_organic">Organic Acids (Acetic, Citric)</option>
            <option value="alkalis">Alkalis (NaOH, KOH)</option>
            <option value="alcohols">Alcohols</option>
            <option value="hydrocarbons">Hydrocarbons</option>
            <option value="oils_mineral">Mineral Oils</option>
            <option value="oils_vegetable">Vegetable Oils</option>
            <option value="chlorine_compounds">Chlorine Compounds</option>
            <option value="oxidizing_agents">Oxidizing Agents</option>
            <option value="solvents">Solvents</option>
            <option value="water">Water</option>
            <option value="slurry_abrasive">Abrasive Slurries</option>
          </select>
          {rawChemicalExposure && rawChemicalExposure.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {rawChemicalExposure.map((chem: string) => (
                <span
                  key={chem}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                >
                  {chem.replace(/_/g, " ")}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalRubberChemicalExposure: rawChemicalExposure?.filter(
                          (c: string) => c !== chem,
                        ),
                      })
                    }
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Special Properties (SANS 1198 Table 4) */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-900 mb-1">
          Special Properties (SANS 1198 Table 4)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 1, label: "I - Heat Resistance", code: "I" },
            { value: 2, label: "II - Ozone Resistance", code: "II" },
            { value: 3, label: "III - Chemical Resistance", code: "III" },
            { value: 4, label: "IV - Abrasion Resistance", code: "IV" },
            { value: 5, label: "V - Contaminant Release", code: "V" },
            { value: 6, label: "VI - Water Resistance", code: "VI" },
            { value: 7, label: "VII - Oil Resistance", code: "VII" },
          ].map((prop) => {
            const isChecked = rawSpecialProperties
              ? rawSpecialProperties.includes(prop.value)
              : false;
            return (
              <label
                key={prop.value}
                className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const current = rawSpecialProperties || [];
                    const updated = e.target.checked
                      ? [...current, prop.value].sort((a, b) => a - b)
                      : current.filter((p: number) => p !== prop.value);
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberSpecialProperties: updated.length > 0 ? updated : null,
                    });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{prop.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* SANS 1198 Line Callout Generator */}
      {rawSansType && rawGrade && rawHardness && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
          <div className="text-xs font-semibold text-blue-900 mb-1">
            SANS 1198:2013 Line Call-out
          </div>
          <div className="font-mono text-sm text-blue-800 bg-white px-2 py-1 rounded border border-blue-300">
            {rawSansType} {rawGrade} {rawHardness}
            {rawSpecialProperties && rawSpecialProperties.length > 0 && (
              <span>
                {" "}
                {rawSpecialProperties
                  .map((p: number) => `(${["I", "II", "III", "IV", "V", "VI", "VII"][p - 1]})`)
                  .join(" ")}
              </span>
            )}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Type {rawSansType}, Grade {rawGrade} (
            {rawGrade === "A"
              ? "18+"
              : rawGrade === "B"
                ? "14+"
                : rawGrade === "C"
                  ? "7+"
                  : "Ebonite"}{" "}
            MPa), {rawHardness} IRHD
            {rawSpecialProperties && rawSpecialProperties.length > 0 && (
              <span> with special properties</span>
            )}
          </div>
        </div>
      )}

      {/* Rubber Lining Summary */}
      {rawSansType && rawGrade && rawThickness && rawHardness && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
            <div className="text-xs text-amber-800">
              <span className="font-medium">Type {rawSansType}</span> • Grade {rawGrade} •{" "}
              {rawThickness}mm • {rawHardness} IRHD
              {rawColour && <span> • {rawColour}</span>}
              {rawVulcanizationMethod && <span> • {rawVulcanizationMethod}</span>}
            </div>
            <button
              type="button"
              onClick={() => {
                const specialPropsRoman = (rawSpecialProperties || [])
                  .map((p: number) => `(${["I", "II", "III", "IV", "V", "VI", "VII"][p - 1]})`)
                  .join(" ");
                const lineCallout = `${rawSansType} ${rawGrade} ${rawHardness}${specialPropsRoman ? ` ${specialPropsRoman}` : ""}`;
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: true,
                  internalRubberLineCallout: lineCallout,
                });
              }}
              className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const InternalRubberLinedOptions = memo(InternalRubberLinedOptionsInner);
