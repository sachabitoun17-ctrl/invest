"use client";

import { useRef, useState } from "react";
import { PropertyWithVotes } from "@/types/property";
import { ExtractedProperty } from "@/lib/extract";

interface Props {
  onAdded: (p: PropertyWithVotes) => void;
  onClose: () => void;
}

type Step = "input" | "review";

interface FormData {
  address: string;
  city: string;
  postalCode: string;
  surface: string;
  rooms: string;
  floor: string;
  type: string;
  price: string;
  notaryFees: string;
  renovMin: string;
  renovMax: string;
  rentMin: string;
  rentMax: string;
  description: string;
}

function toForm(e: ExtractedProperty): FormData {
  return {
    address: e.address ?? "",
    city: e.city ?? "",
    postalCode: e.postalCode ?? "",
    surface: e.surface?.toString() ?? "",
    rooms: e.rooms?.toString() ?? "",
    floor: e.floor?.toString() ?? "",
    type: e.type ?? "",
    price: e.price?.toString() ?? "",
    notaryFees: e.notaryFees?.toString() ?? "",
    renovMin: e.renovMin?.toString() ?? "",
    renovMax: e.renovMax?.toString() ?? "",
    rentMin: e.rentMin?.toString() ?? "",
    rentMax: e.rentMax?.toString() ?? "",
    description: e.description ?? "",
  };
}

function emptyForm(): FormData {
  return {
    address: "", city: "", postalCode: "", surface: "", rooms: "",
    floor: "", type: "", price: "", notaryFees: "", renovMin: "",
    renovMax: "", rentMin: "", rentMax: "", description: "",
  };
}

function Field({
  label, name, value, onChange, type = "text", placeholder,
}: {
  label: string;
  name: keyof FormData;
  value: string;
  onChange: (name: keyof FormData, value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}

export default function UploadModal({ onAdded, onClose }: Props) {
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [step, setStep] = useState<Step>("input");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [pdfName, setPdfName] = useState<string | undefined>();
  const [rawText, setRawText] = useState<string | undefined>();
  const [showRaw, setShowRaw] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateField(name: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleExtract() {
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
      const { extracted, pdfName: name } = await res.json();
      setForm(toForm(extracted as ExtractedProperty));
      setPdfName(name);
      setRawText((extracted as ExtractedProperty).rawText);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!form.address || !form.city) {
      setError("L'adresse et la ville sont obligatoires");
      return;
    }
    const surface = parseFloat(form.surface);
    const price = parseFloat(form.price.replace(/\s/g, ""));
    if (!surface || !price) {
      setError("Surface et prix obligatoires");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        address: form.address,
        city: form.city,
        postalCode: form.postalCode || undefined,
        surface,
        rooms: form.rooms ? parseInt(form.rooms) : undefined,
        floor: form.floor !== "" ? parseInt(form.floor) : undefined,
        type: form.type || undefined,
        price,
        notaryFees: form.notaryFees ? parseFloat(form.notaryFees.replace(/\s/g, "")) : undefined,
        renovMin: form.renovMin ? parseFloat(form.renovMin.replace(/\s/g, "")) : undefined,
        renovMax: form.renovMax ? parseFloat(form.renovMax.replace(/\s/g, "")) : undefined,
        rentMin: form.rentMin ? parseFloat(form.rentMin.replace(/\s/g, "")) : undefined,
        rentMax: form.rentMax ? parseFloat(form.rentMax.replace(/\s/g, "")) : undefined,
        description: form.description || undefined,
        pdfName,
      };

      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              {step === "input" ? "Ajouter un bien" : "Vérifier les infos"}
            </h2>
            {step === "review" && (
              <p className="text-xs text-gray-400 mt-0.5">
                Corrige si besoin, puis enregistre
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2">
          {/* STEP 1: input */}
          {step === "input" && (
            <div className="space-y-4">
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
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
                        Clique pour choisir un PDF d&apos;annonce
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Colle ici le texte de l'annonce immobilière..."
                  className="w-full h-44 border border-gray-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-400"
                />
              )}
            </div>
          )}

          {/* STEP 2: review form */}
          {step === "review" && (
            <div className="space-y-4">
              {/* Location */}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Localisation
                </div>
                <div className="space-y-2">
                  <Field label="Adresse" name="address" value={form.address}
                    onChange={updateField} placeholder="12 rue de la Paix" />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Ville *" name="city" value={form.city}
                      onChange={updateField} placeholder="Paris" />
                    <Field label="Code postal" name="postalCode" value={form.postalCode}
                      onChange={updateField} placeholder="75001" />
                  </div>
                </div>
              </div>

              {/* Property */}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Bien
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Surface (m²) *" name="surface" value={form.surface}
                    onChange={updateField} type="number" placeholder="65" />
                  <Field label="Pièces" name="rooms" value={form.rooms}
                    onChange={updateField} type="number" placeholder="3" />
                  <Field label="Étage" name="floor" value={form.floor}
                    onChange={updateField} type="number" placeholder="2" />
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => updateField("type", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                    >
                      <option value="">—</option>
                      <option value="appartement">Appartement</option>
                      <option value="maison">Maison</option>
                      <option value="studio">Studio</option>
                      <option value="duplex">Duplex</option>
                      <option value="loft">Loft</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Financials */}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Finances (€)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prix de vente *" name="price" value={form.price}
                    onChange={updateField} placeholder="250000" />
                  <Field label="Frais notaire" name="notaryFees" value={form.notaryFees}
                    onChange={updateField} placeholder="auto 8%" />
                  <Field label="Travaux min" name="renovMin" value={form.renovMin}
                    onChange={updateField} placeholder="10000" />
                  <Field label="Travaux max" name="renovMax" value={form.renovMax}
                    onChange={updateField} placeholder="20000" />
                  <Field label="Loyer min /mois" name="rentMin" value={form.rentMin}
                    onChange={updateField} placeholder="800" />
                  <Field label="Loyer max /mois" name="rentMax" value={form.rentMax}
                    onChange={updateField} placeholder="950" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Raw text toggle */}
              {rawText && (
                <div>
                  <button
                    onClick={() => setShowRaw((s) => !s)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    {showRaw ? "Masquer" : "Voir"} le texte extrait du PDF
                  </button>
                  {showRaw && (
                    <pre className="mt-2 text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap text-gray-500">
                      {rawText}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Footer buttons */}
        <div className="px-6 pb-5 pt-3 flex gap-2 shrink-0 border-t border-gray-100">
          {step === "review" && (
            <button
              onClick={() => { setStep("input"); setError(null); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← Retour
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={step === "input" ? handleExtract : handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? step === "input" ? "Extraction…" : "Enregistrement…"
              : step === "input" ? "Extraire →" : "Enregistrer le bien"}
          </button>
        </div>
      </div>
    </div>
  );
}
