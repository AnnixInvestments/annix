"use client";

interface OpsHeaderProps {
  userName: string | null;
  companyName: string | null;
  onMenuToggle: () => void;
  onLogout: () => void;
}

export function OpsHeader(props: OpsHeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 print:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={props.onMenuToggle}
          className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          aria-label="Toggle navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {props.companyName && (
          <span className="text-sm font-medium text-gray-600 hidden sm:inline">
            {props.companyName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {props.userName && (
          <span className="text-sm text-gray-600 hidden sm:inline">{props.userName}</span>
        )}
        <button
          type="button"
          onClick={props.onLogout}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
