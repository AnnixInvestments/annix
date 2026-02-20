"use client";

interface StockChartDataPoint {
  label: string;
  value: number;
}

interface StockChartProps {
  data: StockChartDataPoint[];
  title: string;
}

export function StockChart({ data, title }: StockChartProps) {
  const maxValue = data.reduce((max, point) => Math.max(max, point.value), 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((point) => {
          const widthPercent = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
          return (
            <div key={point.label} className="flex items-center">
              <div className="w-28 flex-shrink-0 text-sm text-gray-600 truncate pr-3">
                {point.label}
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <div className="w-12 flex-shrink-0 text-sm font-medium text-gray-900 text-right pl-3">
                {point.value}
              </div>
            </div>
          );
        })}
      </div>
      {data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No data available</p>
      )}
    </div>
  );
}
