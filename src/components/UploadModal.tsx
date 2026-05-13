"use client";

import { useRef, useState } from "react";
import { PropertyWithVotes } from "@/types/property";

interface Props {
  onAdded: (p: PropertyWithVotes) => void;
  onClose: () => void;
}

export default function UploadModal({ onAdded, onClose }: Props) {
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      if (mode === "pdf" && file) {
        fd.append("file", file);
      } else if (mode === "text" && text.trim()) {
        fd.append("text", text.trim());
      } else {
        setError(mode === "pdf" ? "Sélectionne un PDF" : "Colle le texte de l'annonce");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erreur serveur");
      }
      const property = await res.json();
      onAdded(property);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Ajouter un bien</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4 bg-gray-100 rounded-lg p-1">
            {(["pdf", "text"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "pdf" ? "📄 PDF" : "✍️ Texte"}
              </button>
            ))}
          </div>

          {mode === "pdf" ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div>
                  <div className="text-2xl mb-1">📄</div>
                  <div className="font-medium text-gray-700">{file.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {(file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📤</div>
                  <div className="text-gray-500 text-sm">
                    Glisse ou clique pour choisir un PDF
                  </div>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Colle ici le texte de l'annonce immobilière..."
              className="w-full h-40 border border-gray-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-400"
            />
          )}

          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Analyse en cours..." : "Analyser"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
