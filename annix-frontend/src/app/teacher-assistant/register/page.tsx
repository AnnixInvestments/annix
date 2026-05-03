"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "../components/AuthShell";
import { useTeacherAssistantAuth } from "../context/TeacherAssistantAuthContext";

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useTeacherAssistantAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const returnUrl = searchParams.get("returnUrl") || "/teacher-assistant";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        name: name.trim(),
        schoolName: schoolName.trim() || null,
      });
      router.replace(returnUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create your account.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Generate process-based assignments in minutes"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/teacher-assistant/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
            className="text-[#FFA500] font-semibold hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Your name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#323288] focus:border-transparent"
            placeholder="Ms M. Dlamini"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-1.5">
            School (optional)
          </label>
          <input
            id="schoolName"
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#323288] focus:border-transparent"
            placeholder="Sandton High School"
            autoComplete="organization"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#323288] focus:border-transparent"
            placeholder="you@school.example"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#323288] focus:border-transparent"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={submitting || !email || !password || !name}
          className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#323288] hover:bg-[#252560] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0d20] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FFA500]" />
        </div>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}
