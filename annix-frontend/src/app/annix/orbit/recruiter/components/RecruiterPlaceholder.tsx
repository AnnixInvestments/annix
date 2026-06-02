interface RecruiterPlaceholderProps {
  title: string;
  description: string;
  phase?: string;
}

export function RecruiterPlaceholder(props: RecruiterPlaceholderProps) {
  const phaseValue = props.phase;
  const phase = phaseValue || "a later phase";
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">{props.title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#e0e0f5] mb-5">
          <svg
            className="w-7 h-7 text-[#323288]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">Coming soon</p>
        <p className="mt-2 text-gray-600 dark:text-[#c0c0eb] max-w-xl mx-auto">
          {props.description}
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-[#323288] dark:text-[#9ea0e8]">
          Lands in {phase}
        </p>
      </div>
    </div>
  );
}
