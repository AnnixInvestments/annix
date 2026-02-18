import type { TravelInfo } from "@/app/lib/api/annixRepApi";

interface TravelTimeIndicatorProps {
  travelInfo: TravelInfo;
  compact?: boolean;
}

function travelTimeColor(minutes: number): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  if (minutes < 15) {
    return {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
      icon: "text-green-600 dark:text-green-400",
    };
  }
  if (minutes <= 30) {
    return {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      text: "text-yellow-700 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: "text-yellow-600 dark:text-yellow-400",
    };
  }
  return {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
  };
}

export function TravelTimeIndicator({ travelInfo, compact = false }: TravelTimeIndicatorProps) {
  const colors = travelTimeColor(travelInfo.estimatedMinutes);

  if (compact) {
    return (
      <div className="flex items-center justify-center py-1">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.bg}`}>
          <svg
            className={`w-3 h-3 ${colors.icon}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
            />
          </svg>
          <span className={`text-xs font-medium ${colors.text}`}>
            {travelInfo.estimatedMinutes} min
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-2">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors.bg} ${colors.border}`}
      >
        <svg
          className={`w-4 h-4 ${colors.icon}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
          />
        </svg>
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${colors.text}`}>
            {travelInfo.estimatedMinutes} min travel
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {travelInfo.distanceKm} km
          </span>
        </div>
      </div>
    </div>
  );
}

interface TravelTimeConnectorProps {
  travelInfo: TravelInfo | null;
}

export function TravelTimeConnector({ travelInfo }: TravelTimeConnectorProps) {
  if (!travelInfo) {
    return (
      <div className="flex items-center justify-center h-6">
        <div className="border-l-2 border-dashed border-gray-200 dark:border-slate-700 h-full" />
      </div>
    );
  }

  const colors = travelTimeColor(travelInfo.estimatedMinutes);

  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex-1 border-t border-dashed border-gray-300 dark:border-slate-600" />
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.bg}`}>
        <svg
          className={`w-3 h-3 ${colors.icon}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
          />
        </svg>
        <span className={`text-xs font-medium ${colors.text}`}>
          {travelInfo.estimatedMinutes} min
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({travelInfo.distanceKm} km)
        </span>
      </div>
      <div className="flex-1 border-t border-dashed border-gray-300 dark:border-slate-600" />
    </div>
  );
}

export default TravelTimeIndicator;
