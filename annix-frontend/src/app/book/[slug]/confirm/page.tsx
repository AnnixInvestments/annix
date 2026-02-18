"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { usePublicBookingLink } from "@/app/lib/query/hooks";

export default function BookingConfirmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const meetingId = searchParams.get("meetingId");

  const { data: bookingLink } = usePublicBookingLink(slug);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden text-center">
          <div className="bg-green-600 px-6 py-8 text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-green-100">Your meeting has been scheduled successfully.</p>
          </div>

          <div className="p-6">
            {bookingLink && (
              <div className="mb-6">
                <p className="text-gray-600 mb-1">Meeting with</p>
                <p className="text-xl font-semibold text-gray-900">{bookingLink.hostName}</p>
                <p className="text-gray-500">{bookingLink.name}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{bookingLink?.meetingDurationMinutes ?? 30} minutes</span>
              </div>
              {bookingLink?.meetingType && (
                <p className="text-sm text-gray-500 mt-2">
                  {bookingLink.meetingType === "video" && "Video conference"}
                  {bookingLink.meetingType === "phone" && "Phone call"}
                  {bookingLink.meetingType === "in_person" && "In-person meeting"}
                  {bookingLink.location && ` - ${bookingLink.location}`}
                </p>
              )}
            </div>

            <div className="text-left space-y-4 mb-6">
              <h3 className="font-semibold text-gray-900">What happens next?</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>A confirmation email has been sent to you with the meeting details.</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>A calendar invite will be included in the email.</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>You may receive a reminder before the meeting.</span>
                </li>
              </ul>
            </div>

            {meetingId && <p className="text-xs text-gray-400 mb-4">Reference: #{meetingId}</p>}

            <Link
              href={`/book/${slug}`}
              className="inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Book another meeting
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Need to reschedule? Contact {bookingLink?.hostName ?? "the host"} directly.
        </p>
      </div>
    </div>
  );
}
