"use client";

import { CalibrationList } from "@/app/stock-control/components/quality/CalibrationList";

export default function CalibrationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calibration Certificates</h1>
      </div>
      <CalibrationList />
    </div>
  );
}
