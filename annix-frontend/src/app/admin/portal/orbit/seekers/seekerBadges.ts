export function seekerStatusBadgeClass(status: string): string {
  if (status === "invited") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "registered") {
    return "bg-sky-100 text-sky-700";
  }
  if (status === "new") {
    return "bg-indigo-100 text-indigo-700";
  }
  if (status === "screening") {
    return "bg-blue-100 text-blue-700";
  }
  if (status === "shortlisted") {
    return "bg-violet-100 text-violet-700";
  }
  if (status === "reference_check") {
    return "bg-fuchsia-100 text-fuchsia-700";
  }
  if (status === "active" || status === "accepted") {
    return "bg-green-100 text-green-700";
  }
  if (status === "suspended" || status === "rejected" || status === "deactivated") {
    return "bg-red-100 text-red-700";
  }
  return "bg-gray-100 text-gray-600";
}

export function seekerTierBadgeClass(tier: string): string {
  if (tier === "hard") {
    return "bg-green-100 text-green-700";
  }
  if (tier === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-gray-100 text-gray-600";
}
