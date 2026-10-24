import React, { useState } from 'react';
import {
  X,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Code2,
  FileJson,
  Activity,
  Layers,
} from 'lucide-react';

export function ApiModal({ isOpen, onClose, currentQuestion }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('curl');
  const [copiedKey, setCopiedKey] = useState(null);

  const sampleQuestion =
    currentQuestion && currentQuestion.trim().length > 0
      ? currentQuestion.trim()
      : 'What is a Personal Legend according to Melchizedek?';

  const baseUrl = 'http://localhost:3001';

  const snippets = {
    curl: `curl -X POST ${baseUrl}/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{"question": ${JSON.stringify(sampleQuestion)}}'`,

    fetch: `const response = await fetch('${baseUrl}/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    question: ${JSON.stringify(sampleQuestion)}
  })
});

const data = await response.json();
console.log(data.data.answer);
console.log(data.data.citations);`,

    python: `import requests

url = "${baseUrl}/api/chat"
payload = {"question": ${JSON.stringify(sampleQuestion)}}

response = requests.post(url, json=payload)
data = response.json()

if data.get("success"):
    print("Answer:", data["data"]["answer"])
    print("Citations:", data["data"]["citations"])`,
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (_err) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[#E5A93C]/30 bg-[#141722] p-5 sm:p-6 shadow-2xl shadow-black/80 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2E3D] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5A93C]/15 text-[#E5A93C] border border-[#E5A93C]/30">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#F4E9D5] tracking-wide">
                Alchemist RAG API
              </h3>
              <p className="font-sans text-xs text-[#9CA3AF]">
                Local REST API &middot; Gemini 3.8 Flash &middot; pgvector
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#2A2E3D] bg-[#1C202E] text-[#9CA3AF] hover:text-[#F4E9D5] hover:border-[#E5A93C]/40 transition-colors cursor-pointer"
            title="Close API dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Endpoint Info Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-[#2A2E3D] bg-[#1A1E2B] p-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-400">
              POST
            </span>
            <span className="text-[#F4E9D5] font-semibold break-all">
              {baseUrl}/api/chat
            </span>
          </div>

          <button
            onClick={() => copyToClipboard(`${baseUrl}/api/chat`, 'endpoint')}
            className="flex items-center gap-1.5 rounded-md border border-[#2A2E3D] bg-[#22283A] hover:bg-[#2A3147] hover:border-[#E5A93C]/40 px-2.5 py-1 text-[11px] text-[#A6ADB8] hover:text-[#F4E9D5] transition-colors cursor-pointer self-start sm:self-auto"
          >
            {copiedKey === 'endpoint' ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>

        {/* Code Snippet Tabs */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-[#2A2E3D] bg-[#111420] p-1 text-xs">
              <button
                onClick={() => setActiveTab('curl')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  activeTab === 'curl'
                    ? 'bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/40 shadow-xs'
                    : 'text-[#9CA3AF] hover:text-[#F4E9D5]'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveTab('fetch')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  activeTab === 'fetch'
                    ? 'bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/40 shadow-xs'
                    : 'text-[#9CA3AF] hover:text-[#F4E9D5]'
                }`}
              >
                JavaScript
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  activeTab === 'python'
                    ? 'bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/40 shadow-xs'
                    : 'text-[#9CA3AF] hover:text-[#F4E9D5]'
                }`}
              >
                Python
              </button>
            </div>

            <button
              onClick={() => copyToClipboard(snippets[activeTab], activeTab)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E5A93C]/40 bg-[#E5A93C]/10 hover:bg-[#E5A93C]/25 px-3 py-1.5 text-xs font-semibold text-[#F4E9D5] transition-all cursor-pointer"
            >
              {copiedKey === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied snippet!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>Copy {activeTab.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>

          <div className="relative rounded-xl border border-[#2A2E3D] bg-[#0A0C13] p-4 text-xs font-mono text-[#C5CCD8] overflow-x-auto shadow-inner">
            <pre className="leading-relaxed whitespace-pre">
              {snippets[activeTab]}
            </pre>
          </div>
        </div>

        {/* Interactive Tools & Documentation Links */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#2A2E3D]">
          <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
            Explore & Test Locally
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href={`${baseUrl}/demo`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-[#2A2E3D] bg-[#1A1E2B] p-3 text-xs text-[#F4E9D5] hover:border-[#E5A93C]/50 hover:bg-[#22283A] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#E5A93C]" />
                <div className="flex flex-col">
                  <span className="font-semibold group-hover:text-[#E5A93C]">
                    Developer Playground UI
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    Side-by-side UI & JSON inspector
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#E5A93C]" />
            </a>

            <a
              href={`${baseUrl}/docs`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-[#2A2E3D] bg-[#1A1E2B] p-3 text-xs text-[#F4E9D5] hover:border-[#E5A93C]/50 hover:bg-[#22283A] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-[#38BDF8]" />
                <div className="flex flex-col">
                  <span className="font-semibold group-hover:text-[#38BDF8]">
                    Swagger UI Documentation
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    Interactive OpenAPI 3.0.3 testing
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#38BDF8]" />
            </a>

            <a
              href={`${baseUrl}/openapi.json`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-[#2A2E3D] bg-[#1A1E2B] p-3 text-xs text-[#F4E9D5] hover:border-[#E5A93C]/50 hover:bg-[#22283A] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <FileJson className="w-4 h-4 text-[#A78BFA]" />
                <div className="flex flex-col">
                  <span className="font-semibold group-hover:text-[#A78BFA]">
                    OpenAPI Spec (JSON)
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    Raw machine-readable schema
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#A78BFA]" />
            </a>

            <a
              href={`${baseUrl}/api/health?deep=true`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-[#2A2E3D] bg-[#1A1E2B] p-3 text-xs text-[#F4E9D5] hover:border-[#E5A93C]/50 hover:bg-[#22283A] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="font-semibold group-hover:text-emerald-400">
                    Deep Health Diagnostics
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    pgvector & embedding status
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-emerald-400" />
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
          <span>
            CLI Demo: <code className="text-[#E5A93C]">npm run api:demo</code>
          </span>
          <span>
            Postman: <code className="text-[#E5A93C]">alchemist_api.postman_collection.json</code>
          </span>
        </div>
      </div>
    </div>
  );
}
