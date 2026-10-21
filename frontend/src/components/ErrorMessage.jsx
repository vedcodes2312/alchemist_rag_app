import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

const FRIENDLY_MESSAGES = {
  VALIDATION_ERROR: 'Please enter a valid question between 1 and 500 characters.',
  INDEX_NOT_READY:
    'The book has not been indexed yet. The RAG pipeline foundation is ready; run the ingestion script once the source text is available.',
  EMBEDDING_SERVICE_UNAVAILABLE:
    'The local search component (FastAPI embedding service) is unreachable. Please verify it is running on port 8001.',
  DATABASE_UNAVAILABLE:
    'The library database is currently unreachable. Please check your Supabase connection.',
  LLM_RATE_LIMITED:
    'The generation service is momentarily busy. Please try again shortly.',
  LLM_TIMEOUT:
    'Generating an answer timed out. Please try asking again.',
  LLM_ERROR:
    'The answer generation service encountered an error. Please retry.',
  RATE_LIMITED:
    'Too many questions have been asked recently. Please wait a moment.',
  NETWORK_ERROR:
    'Unable to connect to the library server. Please check your network connection.',
};

export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;

  const { code, message, requestId } = error;
  const friendlyCopy = FRIENDLY_MESSAGES[code] || message || 'An unexpected error occurred.';
  const isIndexNotReady = code === 'INDEX_NOT_READY';

  return (
    <div
      role="alert"
      className="my-3 flex flex-col gap-3 rounded-xl border border-[#A85C43]/50 bg-[#22283A] p-4 text-[#F4E9D5] shadow-md animate-message-in"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#A85C43]/20 text-[#E0907A]">
          <AlertTriangle className="h-4 w-4" strokeWidth={2} />
        </div>

        <div className="flex-1">
          <h2 className="font-sans text-sm font-semibold text-[#E0907A] mb-1">
            {isIndexNotReady ? 'Index Not Initialized' : 'Notice'}
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#F4E9D5] leading-relaxed">
            {friendlyCopy}
          </p>

          {requestId && (
            <div className="mt-2 font-mono text-[11px] text-[#A39A8C]">
              Request ID: {requestId}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-1 border-t border-[#A85C43]/20">
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-[#D7B98E]/30 bg-[#171A24] px-3 py-1.5 font-sans text-xs font-semibold text-[#D7B98E] transition-all hover:border-[#C69B55] hover:text-[#C69B55] active:scale-[0.98]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{isIndexNotReady ? 'Check Again' : 'Retry'}</span>
        </button>
      </div>
    </div>
  );
}
