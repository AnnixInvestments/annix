"use client";

interface DeviceInfoDisplayProps {
  fingerprint: string | null;
  isLoading: boolean;
}

export function DeviceInfoDisplay({ fingerprint, isLoading }: DeviceInfoDisplayProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-2">Device Information</h4>
      {isLoading ? (
        <p className="text-sm text-gray-500">Generating device fingerprint...</p>
      ) : fingerprint ? (
        <div className="text-sm text-gray-600">
          <p>
            <span className="font-medium">Device ID:</span> {fingerprint.substring(0, 16)}...
          </p>
          <p className="mt-1 text-xs text-gray-500">
            This device will be registered for secure access.
          </p>
        </div>
      ) : (
        <p className="text-sm text-red-600">
          Unable to generate device fingerprint. Please refresh the page.
        </p>
      )}
    </div>
  );
}

export function SecurityNotice() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex">
        <svg
          className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h3 className="text-sm font-medium text-yellow-800">Important Security Notice</h3>
          <p className="mt-1 text-sm text-yellow-700">
            Your account will be bound to this device. You will only be able to access your account
            from this device. If you need to change devices, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DocumentStorageNotice() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex">
        <svg
          className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <div>
          <h3 className="text-sm font-medium text-blue-800">Secure Document Storage</h3>
          <p className="mt-1 text-sm text-blue-700">
            Your uploaded documents (registration certificates, VAT certificates, BEE certificates,
            etc.) will be stored securely and encrypted using AES-256 encryption. Only authorized
            administrators can access these documents for verification purposes. Your documents will
            be retained for the duration of your account and securely deleted if your account is
            suspended or closed.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TermsAndConditions() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
      <h4 className="text-sm font-medium text-gray-900 mb-2">Terms and Conditions</h4>
      <div className="text-xs text-gray-600 space-y-2">
        <p>By registering for an account, you agree to the following:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>You are authorized to represent the company specified in this registration.</li>
          <li>You will not share your login credentials with any other person.</li>
          <li>Your account is bound to a single device for security purposes.</li>
          <li>
            You will maintain the confidentiality of any pricing or technical information provided.
          </li>
          <li>You will use the portal only for legitimate business purposes.</li>
          <li>
            Annix reserves the right to suspend or terminate accounts for any violation of these
            terms.
          </li>
        </ul>
      </div>
    </div>
  );
}

interface AcceptanceCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  required?: boolean;
}

export function AcceptanceCheckbox({
  id,
  checked,
  onChange,
  label,
  required = false,
}: AcceptanceCheckboxProps) {
  return (
    <div className="flex items-start">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label htmlFor={id} className="ml-2 text-sm text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}

interface ErrorDisplayProps {
  error: string | null;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm text-red-700">{error}</p>
    </div>
  );
}

interface InfoBannerProps {
  title: string;
  message: string;
  variant?: "info" | "warning";
}

export function InfoBanner({ title, message, variant = "info" }: InfoBannerProps) {
  const colorClasses = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      title: "text-blue-800",
      message: "text-blue-700",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      icon: "text-yellow-600",
      title: "text-yellow-800",
      message: "text-yellow-700",
    },
  };

  const colors = colorClasses[variant];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
      <div className="flex">
        <svg
          className={`w-5 h-5 ${colors.icon} mr-2 flex-shrink-0 mt-0.5`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 className={`text-sm font-medium ${colors.title}`}>{title}</h3>
          <p className={`mt-1 text-sm ${colors.message}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}
