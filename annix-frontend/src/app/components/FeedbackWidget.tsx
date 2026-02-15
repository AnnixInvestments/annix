"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFeatureGate } from "@/app/hooks/useFeatureGate";
import { useVoiceDictation } from "@/app/hooks/useVoiceDictation";
import { useSubmitFeedback } from "@/app/lib/query/hooks";

type FeedbackSource = "text" | "voice";

export function FeedbackWidget() {
  const pathname = usePathname();
  const { isFeatureEnabled, isLoading: flagsLoading } = useFeatureGate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [feedbackSource, setFeedbackSource] = useState<FeedbackSource>("text");
  const [showSuccess, setShowSuccess] = useState(false);

  const submitFeedback = useSubmitFeedback();

  const handleTranscriptChange = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setContent(transcript);
    }
  }, []);

  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceDictation({
    language: "en-ZA",
    onTranscript: handleTranscriptChange,
  });

  useEffect(() => {
    if (transcript) {
      setContent(transcript);
      setFeedbackSource("voice");
    }
  }, [transcript]);

  const handleSubmit = async () => {
    if (!content.trim() || content.length < 10) {
      return;
    }

    await submitFeedback.mutateAsync({
      content: content.trim(),
      source: feedbackSource,
      pageUrl: pathname,
    });

    setContent("");
    resetTranscript();
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setIsExpanded(false);
    }, 3000);
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setFeedbackSource("voice");
      startListening();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setFeedbackSource("text");
  };

  const handleClose = () => {
    setIsExpanded(false);
    setContent("");
    resetTranscript();
    if (isListening) {
      stopListening();
    }
  };

  const displayContent = isListening ? content + interimTranscript : content;

  if (flagsLoading || !isFeatureEnabled("FEEDBACK_WIDGET")) {
    return null;
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-20 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Give Feedback"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-blue-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="font-medium text-white">Send Feedback</span>
        </div>
        <button onClick={handleClose} className="text-white/80 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {showSuccess ? (
          <div className="text-center py-4">
            <svg
              className="w-12 h-12 text-green-500 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-green-700 font-medium">Thank you for your feedback!</p>
            <p className="text-sm text-gray-500 mt-1">We appreciate your input.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Help us improve! Share your thoughts, report issues, or suggest features.
            </p>

            <div className="relative">
              <textarea
                value={displayContent}
                onChange={handleTextChange}
                placeholder="Type your feedback here..."
                className={`w-full h-24 p-3 border rounded-lg resize-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isListening ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
                disabled={isListening}
              />
              {isListening && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-red-600">Listening...</span>
                </div>
              )}
            </div>

            {voiceError && <p className="text-xs text-red-600 mt-1">{voiceError}</p>}

            {submitFeedback.error && (
              <p className="text-xs text-red-600 mt-1">{submitFeedback.error.message}</p>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {voiceSupported && (
                  <button
                    onClick={handleVoiceToggle}
                    className={`p-2 rounded-full transition-colors ${
                      isListening
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={isListening ? "Stop recording" : "Start voice dictation"}
                  >
                    {isListening ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    )}
                  </button>
                )}
                <span className="text-xs text-gray-400">
                  {content.length}/5000
                  {content.length < 10 && content.length > 0 && (
                    <span className="text-yellow-600 ml-1">(min 10 characters)</span>
                  )}
                </span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={
                  !content.trim() || content.length < 10 || submitFeedback.isPending || isListening
                }
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitFeedback.isPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
