"use client";

import { useRef, useState } from "react";
import { PropertyWithVotes } from "@/types/property";
import { ExtractedProperty } from "@/lib/extract";

interface Props {
  onAdded: (properties: PropertyWithVotes[]) => void;
  onClose: () => void;
}

type Mode = "pdf" | "url" | "text";
type BatchStatus = "pending" | "extracting" | "done" | "error";

interface BatchItem {
  id: string;
  fileName: string;
  status: BatchStatus;
  extracted?: ExtractedProperty;
  error?: string;
  // editable fields
  price: string;
  surface: string;
  city: string;
  address: string;
  rooms: string;
  rentMin: string;
  rentMax: string;
  renovMin: string;
  renovMax: string;
  marketPriceM2: string;
  strategy: string;
  type: string;
  postalCode: string;
  floor: string;
  dpe: string;
  description: string;
}

function makeItem(file: File): BatchItem {
  return {
    id: Math.random().toString(36).slice(2),
    fileName: file.name,
    status: "pending",
    price: "", surface: "", city: "", address: "", rooms: "",
    rentMin: "", rentMax: "", renovMin: "", renovMax: "",
    marketPriceM2: "", strategy: "B", type: "", postalCode: "",
    floor: "", dpe: "", description: "",
  };
}

function fillFromExtracted(item: BatchItem, e: ExtractedProperty): BatchItem {
  return {
    ...item,
    status: "done",
    extracted: e,
    price: e.price?.toString() ?? "",
    surface: e.surface?.toString() ?? "",
    city: e.city ?? "",
    address: e.address ?? "",
    rooms: e.rooms?.toString() ?? "",
    rentMin: e.rentMin?.toString() ?? "",
    rentMax: e.rentMax?.toString() ?? "",
    renovMin: e.renovMin?.toString() ?? "",
    renovMax: e.renovMax?.toString() ?? "",
    type: e.type ?? "",
    postalCode: e.postalCode ?? "",
    floor: e.floor?.toString() ?? "",
    dpe: e.dpe ?? "",
    description: e.description ?? "",
  };
}

const STRATEGY_OPTIONS = [
  { value: "B", label: "B — Locatif" },
  { value: "A", label: "A — Revente" },
  { value: "AB", label: "A+B — Les deux" },
];

export default function UploadModal({ onAdded, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("pdf");
  const [urlValue, setUrlValue] = useState("");
  const [text, setText] = useState("");
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBatchMode = mode === "pdf" && batch.length > 0;
  const allDone = batch.length > 0 && batch.every((i) => i.status === "done" || i.status === "error");
  const validItems = batch.filter((i) => i.status === "done");

  function updateItem(id: string, patch: Partial<BatchItem>) {
    setBatch((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function extractFile(file: File, id: string) {
    updateItem(id, { status: "extracting" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const { extracted } = await res.json();
      setBatch((prev) =>
        prev.map((i) => (i.id === id ? fillFromExtracted(i, extracted) : i))
      );
    } catch (e) {
      updateItem(id, { status: "error", error: e instanceof Error ? e.message : "Erreur" });
    }
  }

  async function handleFilesSelected(files: FileList) {
    const items = Array.from(files).map(makeItem);
    setBatch((prev) => [...prev, ...items]);
    // Extract in parallel (max 3 at a time)
    const arr = Array.from(files);
    for (let i = 0; i < arr.length; i += 3) {
      await Promise.all(
        arr.slice(i, i + 3).map((f, j) => extractFile(f, items[i + j].id))
      );
    }
  }

  async function handleSingleExtract() {
    setGlobalError(null);
    const fd = new FormData();
    if (mode === "url" && urlValue.trim()) {
      fd.append("url", urlValue.trim());
    } else if (mode === "text" && text.trim()) {
      fd.append("text", text.trim());
    } else {
      setGlobalError(mode === "url" ? "Colle une URL" : "Colle le texte");
      return;
    }
    const item: BatchItem = {
      id: Math.random().toString(36).slice(2),
      fileName: mode === "url" ? urlValue : "texte",
      status: "extracting",
      price: "", surface: "", city: "", address: "", rooms: "",
      rentMin: "", rentMax: "", renovMin: "", renovMax: "",
      marketPriceM2: "", strategy: "B", type: "", postalCode: "",
      floor: "", dpe: "", description: "",
    };
    setBatch([item]);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const { extracted } = await res.json();
      setBatch([fillFromExtracted(item, extracted)]);
    } catch (e) {
      setBatch([{ ...item, status: "error", error: e instanceof Error ? e.message : "Erreur" }]);
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    setGlobalError(null);
    const saved: PropertyWithVotes[] = [];
    for (const item of validItems) {
      const surface = parseFloat(item.surface);
      const price = parseFloat(item.price.replace(/\s/g, ""));
      if (!item.city || !surface || !price) continue;
      try {
        const payload = {
          address: item.address, city: item.city, postalCode: item.postalCode || undefined,
          surface, price,
          rooms: item.rooms ? parseInt(item.rooms) : undefined,
          floor: item.floor !== "" ? parseInt(item.floor) : undefined,
          type: item.type || undefined,
          renovMin: item.renovMin ? parseFloat(item.renovMin.replace(/\s/g, "")) : undefined,
          renovMax: item.renovMax ? parseFloat(item.renovMax.replace(/\s/g, "")) : undefined,
          rentMin: item.rentMin ? parseFloat(item.rentMin.replace(/\s/g, "")) : undefined,
          rentMax: item.rentMax ? parseFloat(item.rentMax.replace(/\s/g, "")) : undefined,
          marketPriceM2: item.marketPriceM2 ? parseFloat(item.marketPriceM2) : undefined,
          strategy: item.strategy || undefined,
          dpe: item.dpe || undefined,
          description: item.description || undefined,
          pdfName: item.fileName,
        };
        const fd = new FormData();
        fd.append("data", JSON.stringify(payload));
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) saved.push(await res.json());
      } catch { /* continue */ }
    }
    setSaving(false);
    if (saved.length > 0) {
      onAdded(saved);
      onClose();
    } else {
      setGlobalError("Aucun bien enregistré. Vérifie ville + prix + surface.");
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ajouter des biens</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isBatchMode || batch.length > 0
                ? `${batch.length} fichier${batch.length > 1 ? "s" : ""} — vérifie et complète les infos`
                : "PDF (plusieurs à la fois), URL ou texte"}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* Input step — shown when no batch yet */}
          {batch.length === 0 && (
            <div className="space-y-4">
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                {(["pdf", "📄 PDF"], ["url", "🔗 URL"], ["text", "✍️ Texte"]] as unknown as [Mode, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {mode === "pdf" && (
                <div
                  onClick={() => inputRef.current?.click()}
                  onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFilesSelected(e.dataTransfer.files); }}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-slate-50 rounded-xl p-10 text-center cursor-pointer transition-all"
                >
                  <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden"
                    onChange={(e) => e.target.files && handleFilesSelected(e.target.files)} />
                  <div className="text-4xl mb-3">📤</div>
                  <div className="font-medium text-slate-600">Glisse ou clique pour choisir des PDFs</div>
                  <div className="text-xs text-slate-400 mt-1">Plusieurs fichiers acceptés — traitement simultané</div>
                </div>
              )}

              {mode === "url" && (
                <div className="space-y-2">
                  <input type="url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="https://www.seloger.com/annonces/..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  <p className="text-xs text-slate-400">SeLoger, LeBonCoin, PAP, Logic-Immo…</p>
                </div>
              )}

              {mode === "text" && (
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Colle ici le texte de l'annonce…"
                  className="w-full h-40 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              )}
            </div>
          )}

          {/* Batch review */}
          {batch.length > 0 && (
            <div className="space-y-3">
              {batch.map((item) => (
                <BatchCard key={item.id} item={item} onChange={(patch) => updateItem(item.id, patch)} />
              ))}
              {/* Add more PDFs */}
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                + Ajouter d&apos;autres PDFs
              </button>
              <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden"
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)} />
            </div>
          )}
        </div>

        {globalError && (
          <div className="mx-6 mb-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
            {globalError}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 flex gap-2 shrink-0 border-t border-slate-100">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">
            Annuler
          </button>
          {batch.length === 0 && mode !== "pdf" && (
            <button onClick={handleSingleExtract}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
              Extraire les données →
            </button>
          )}
          {batch.length > 0 && allDone && (
            <button onClick={handleSaveAll} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {saving ? "Enregistrement…" : `Enregistrer ${validItems.length} bien${validItems.length > 1 ? "s" : ""}`}
            </button>
          )}
          {batch.length > 0 && !allDone && (
            <div className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-medium text-center">
              Extraction en cours…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Batch item card ────────────────────────────────────────────

function BatchCard({ item, onChange }: { item: BatchItem; onChange: (p: Partial<BatchItem>) => void }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = item.status === "extracting" ? "⏳"
    : item.status === "done" ? "✓"
    : item.status === "error" ? "✗" : "·";
  const statusColor = item.status === "done" ? "text-emerald-600 bg-emerald-50"
    : item.status === "error" ? "text-red-500 bg-red-50"
    : item.status === "extracting" ? "text-amber-500 bg-amber-50"
    : "text-slate-400 bg-slate-100";

  const missingRequired = item.status === "done" && (!item.city || !item.price || !item.surface);

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      missingRequired ? "border-amber-300" : item.status === "error" ? "border-red-200" : "border-slate-200"
    }`}>
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
        onClick={() => item.status === "done" && setExpanded((e) => !e)}
      >
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${statusColor}`}>
          {statusIcon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">{item.fileName}</div>
          {item.status === "done" && (
            <div className="text-xs text-slate-400">
              {[item.city, item.price ? `${item.price} €` : null, item.surface ? `${item.surface} m²` : null]
                .filter(Boolean).join(" · ")}
              {missingRequired && <span className="text-amber-600 ml-1">— champs manquants</span>}
            </div>
          )}
          {item.status === "error" && <div className="text-xs text-red-500">{item.error}</div>}
          {item.status === "extracting" && <div className="text-xs text-slate-400 animate-pulse">Extraction…</div>}
        </div>
        {item.status === "done" && (
          <span className="text-xs text-slate-400 shrink-0">{expanded ? "▲" : "▼"}</span>
        )}
      </div>

      {/* Expanded edit form */}
      {expanded && item.status === "done" && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50/50">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <MiniField label="Ville *" value={item.city} onChange={(v) => onChange({ city: v })} placeholder="Paris" />
            <MiniField label="Code postal" value={item.postalCode} onChange={(v) => onChange({ postalCode: v })} placeholder="75011" />
            <MiniField label="Adresse" value={item.address} onChange={(v) => onChange({ address: v })} placeholder="12 rue..." />

            <MiniField label="Surface m² *" value={item.surface} onChange={(v) => onChange({ surface: v })} type="number" />
            <MiniField label="Prix * €" value={item.price} onChange={(v) => onChange({ price: v })} type="number" />
            <MiniField label="Pièces" value={item.rooms} onChange={(v) => onChange({ rooms: v })} type="number" />

            <MiniField label="Loyer min €/mo" value={item.rentMin} onChange={(v) => onChange({ rentMin: v })} type="number" />
            <MiniField label="Loyer max €/mo" value={item.rentMax} onChange={(v) => onChange({ rentMax: v })} type="number" />
            <MiniField label="Prix marché €/m²" value={item.marketPriceM2} onChange={(v) => onChange({ marketPriceM2: v })} type="number" placeholder="ex: 9500" />

            <MiniField label="Travaux min €" value={item.renovMin} onChange={(v) => onChange({ renovMin: v })} type="number" />
            <MiniField label="Travaux max €" value={item.renovMax} onChange={(v) => onChange({ renovMax: v })} type="number" />
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">Stratégie</label>
              <select value={item.strategy} onChange={(e) => onChange({ strategy: e.target.value })}
                className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400">
                {STRATEGY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniField({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white" />
    </div>
  );
}
