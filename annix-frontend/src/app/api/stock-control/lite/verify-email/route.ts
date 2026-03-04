import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  if (!token) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/stock-control/lite/verify-error.html?error=missing_token",
      },
    });
  }

  try {
    const response = await fetch(
      `${apiBase}/stock-control/auth/verify-email?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/stock-control/lite/verify-success.html",
        },
      });
    } else {
      const errorText = await response.text();
      const errorMessage = encodeURIComponent(errorText || "Verification failed");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/stock-control/lite/verify-error.html?error=${errorMessage}`,
        },
      });
    }
  } catch {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/stock-control/lite/verify-error.html?error=network_error",
      },
    });
  }
}
