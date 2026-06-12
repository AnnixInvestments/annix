"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { isApiError } from "@/app/lib/api/apiError";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const token = searchParams.get("token") || "";

  const { data: info, isLoading } = useQuery({
    queryKey: ["annix-orbit", "team-invite", token],
    queryFn: () => annixOrbitApiClient.teamInviteInfo(token),
    enabled: token.length > 0,
  });

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const acceptMutation = useMutation({
    mutationFn: () => annixOrbitApiClient.acceptTeamInvite({ token, name, password }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter your name.", "error");
      return;
    }
    if (password.length < 8) {
      showToast("Password must be at least 8 characters.", "error");
      return;
    }
    try {
      await acceptMutation.mutateAsync();
      showToast("Account created — please sign in.", "success");
      router.push("/annix/orbit/login?type=recruiter");
    } catch (err) {
      if (isApiError(err) && (err.status === 400 || err.status === 409)) {
        showToast(err.message, "error");
      } else {
        showToast("Could not accept the invite. Please try again.", "error");
      }
    }
  };

  const inputClasses =
    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc] focus:border-transparent";

  const invalid = !token || (info && !info.valid);
  const agencyName = info?.valid && info.agencyName ? info.agencyName : "the agency";
  const inviteEmail = info?.valid && info.email ? info.email : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#323288]" />
            </div>
          ) : invalid ? (
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Invite not valid</h1>
              <p className="mt-2 text-gray-600">
                This invitation is invalid, has expired, or has already been used. Ask your agency
                to send a fresh one.
              </p>
              <Link
                href="/annix/orbit/login?type=recruiter"
                className="mt-6 inline-block text-[#323288] font-medium"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Join {agencyName}</h1>
                <p className="text-gray-600 mt-2">
                  Set your name and a password to join the recruitment team
                  {inviteEmail ? ` as ${inviteEmail}` : ""}.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="ai-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your name
                  </label>
                  <input
                    id="ai-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={inputClasses}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label htmlFor="ai-pass" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="ai-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={inputClasses}
                    placeholder="At least 8 characters"
                  />
                </div>
                <button
                  type="submit"
                  disabled={acceptMutation.isPending}
                  className="w-full bg-[#323288] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#252560] disabled:opacity-50"
                >
                  {acceptMutation.isPending ? "Creating account…" : "Join the team"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7373c2]" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
