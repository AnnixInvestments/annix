'use client'

import CSGBend3DPreview from '@/app/components/rfq/CSGBend3DPreview'

const testData = {
  id: '1767961833475',
  notes: 'Custom bend fabrication required',
  specs: {
    stubs: [
      {
        length: 398,
        flangeSpec: '',
        nominalBoreMm: 400,
        locationFromFlange: 1000
      },
      {
        length: 150,
        flangeSpec: '',
        nominalBoreMm: 400,
        locationFromFlange: 600
      }
    ],
    bendDegrees: 48,
    bendRadiusMm: 510,
    quantityType: 'number_of_items',
    nominalBoreMm: 500,
    numberOfStubs: 2,
    quantityValue: 1,
    addBlankFlange: false,
    bendRadiusType: 'elbow',
    centerToFaceMm: 510,
    scheduleNumber: 'WT6',
    tangentLengths: [2000, 2000],
    closureLengthMm: 0,
    wallThicknessMm: 6,
    blankFlangeCount: 0,
    numberOfSegments: 4,
    numberOfTangents: 2,
    workingPressureBar: 16,
    workingTemperatureC: 120,
    bendEndConfiguration: 'FOE_LF',
    blankFlangePositions: [],
    steelSpecificationId: 8,
    useGlobalFlangeSpecs: true
  },
  itemType: 'bend',
  calculation: {
    bendWeight: 465.36,
    totalWeight: 664.8,
    flangeWeight: 66.48,
    tangentWeight: 132.96,
    numberOfFlanges: 3,
    wallThicknessMm: 6.35,
    numberOfButtWelds: 1,
    outsideDiameterMm: 320,
    numberOfFlangeWelds: 2,
    totalButtWeldLength: 0.9424777960769379,
    centerToFaceDimension: 183.03148938411007,
    totalFlangeWeldLength: 1.8849555921538759
  },
  description:
    '500NB W/T 6.35mm SABS 719 ERW 48° Short Radius 4 Seg Bend 2510x2510 C/F + 400NB x 398mm Stub + 400NB x 150mm Stub FOE+L/F BS 4504 10/3',
  clientItemNumber: 'NBC-0001'
}

export default function CSGTestPage() {
  const { specs } = testData

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">CSG 3D Preview Test</h1>
        <p className="text-gray-600 mb-6">Testing three-bvh-csg for hollow pipes with saddle cuts</p>

        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Test Item</h2>
          <p className="text-sm text-gray-600 mb-4">{testData.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-500">Nominal Bore</div>
              <div className="font-semibold">{specs.nominalBoreMm}mm</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-500">Wall Thickness</div>
              <div className="font-semibold">{specs.wallThicknessMm}mm</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-500">Bend Angle</div>
              <div className="font-semibold">{specs.bendDegrees}°</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-500">Segments</div>
              <div className="font-semibold">{specs.numberOfSegments}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-500">Tangent 1</div>
              <div className="font-semibold">{specs.tangentLengths[0]}mm</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-500">Tangent 2</div>
              <div className="font-semibold">{specs.tangentLengths[1]}mm</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-500">End Config</div>
              <div className="font-semibold">{specs.bendEndConfiguration}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-500">Stubs</div>
              <div className="font-semibold">{specs.numberOfStubs}</div>
            </div>
          </div>

          {specs.stubs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Stub Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {specs.stubs.map((stub, index) => (
                  <div key={index} className="bg-blue-50 p-3 rounded text-sm">
                    <div className="font-medium text-blue-800">Stub {index + 1}</div>
                    <div className="text-blue-600">
                      {stub.nominalBoreMm}NB × {stub.length}mm @ {stub.locationFromFlange}mm from flange
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold text-gray-700">CSG 3D Preview</h2>
            <p className="text-sm text-gray-500">
              Acceptance Criteria: Hollow pipe ends, realistic stub intersections (saddle cuts), welds follow seam
            </p>
          </div>

          <CSGBend3DPreview
            nominalBore={specs.nominalBoreMm}
            wallThickness={specs.wallThicknessMm}
            bendAngle={specs.bendDegrees}
            bendType={specs.bendRadiusType}
            tangent1={specs.tangentLengths[0]}
            tangent2={specs.tangentLengths[1]}
            numberOfSegments={specs.numberOfSegments}
            stubs={specs.stubs}
            flangeConfig={specs.bendEndConfiguration}
            closureLengthMm={specs.closureLengthMm}
            materialName="SABS 719 ERW"
          />
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">Acceptance Criteria Checklist</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>✓ Pipe ends are hollow (visible wall thickness via CSG subtraction)</li>
            <li>✓ Stub intersections are realistic (proper saddle cuts using CSG)</li>
            <li>✓ Welds follow intersection seam (computed saddle curve geometry)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
