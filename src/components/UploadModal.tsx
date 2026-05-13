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
  address: string; city: string; postalCode: string;
  surface: string; rooms: string; floor: string; type: string;
  price: string; notaryFees: string; renovMin: string; renovMax: string;
  rentMin: string; rentMax: string; description: string;
}

function toForm(e: ExtractedProperty): FormData {
  return {
    address: e.address ?? "", city: e.city ?? "", postalCode: e.postalCode ?? "",
    surface: e.surface?.toString() ?? "", rooms: e.rooms?.toString() ?? "",
    floor: e.floor?.toString() ?? "", type: e.type ?? "",
    price: e.price?.toString() ?? "", notaryFees: e.notaryFees?.toString() ?? "",
    renovMin: e.renovMin?.toString() ?? "", renovMax: e.renovMax?.toString() ?? "",
    rentMin: e.rentMin?.toString() ?? "", rentMax: e.rentMax?.toString() ?? "",
    description: e.description ?? "",
  };
}

function empty(): FormData {
  return { address:"",city:"",postalCode:"",surface:"",rooms:"",floor:"",type:"",
    price:"",notaryFees:"",renovMin:"",renovMax:"",rentMin:"",rentMax:"",description:"" };
}

function Field({ label, name, value, onChange, type="text", placeholder }: {
  label: string; name: keyof FormData; value: string;
  onChange: (n: keyof FormData, v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
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
  const [form, setForm] = useState<FormData>(empty());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function set(name: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleExtract() {
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      if (mode === "pdf" && file) fd.append("file", file);
      else if (mode === "text" && text.trim()) fd.append("text", text.trim());
      else { setError(mode === "pdf" ? "Sélectionne un PDF" : "Colle le texte"); setLoading(false); return; }

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const { extracted, pdfName: name } = await res.json();
      setForm(toForm(extracted as ExtractedProperty));
      setPdfName(name);
      setRawText((extracted as ExtractedProperty).rawText);
      setStep("review");
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    setError(null);
    if (!form.city) { setError("La ville est obligatoire"); return; }
    const surface = parseFloat(form.surface);
    const price = parseFloat(form.price.replace(/\s/g, ""));
    if (!surface || !price) { setError("Surface et prix obligatoires"); return; }

    setLoading(true);
    try {
      const payload = {
        address: form.address, city: form.city, postalCode: form.postalCode || undefined,
        surface, rooms: form.rooms ? parseInt(form.rooms) : undefined,
        floor: form.floor !== "" ? parseInt(form.floor) : undefined,
        type: form.type || undefined, price,
        notaryFees: form.notaryFees ? parseFloat(form.notaryFees.replace(/\s/g, "")) : undefined,
        renovMin: form.renovMin ? parseFloat(form.renovMin.replace(/\s/g, "")) : undefined,
        renovMax: form.renovMax ? parseFloat(form.renovMax.replace(/\s/g, "")) : undefined,
        rentMin: form.rentMin ? parseFloat(form.rentMin.replace(/\s/g, "")) : undefined,
        rentMax: form.rentMax ? parseFloat(form.rentMax.replace(/\s/g, "")) : undefined,
        description: form.description || undefined, pdfName,
      };
      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      onAdded(await res.json());
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {step === "input" ? "Ajouter un bien" : "Vérifier les infos"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === "input"
                ? "Upload un PDF d'annonce ou colle le texte"
                : "Corrige si besoin puis enregistre"}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* STEP 1 */}
          {step === "input" && (
            <div className="space-y-4">
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                {(["pdf", "text"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}>
                    {m === "pdf" ? "📄 PDF" : "✍️ Texte"}
                  </button>
                ))}
              </div>

              {mode === "pdf" ? (
                <div onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    file ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  }`}>
                  <input ref={inputRef} type="file" accept=".pdf" className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  {file ? (
                    <div>
                      <div className="text-3xl mb-2">📄</div>
                      <div className="font-semibold text-slate-800">{file.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(0)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-3">📤</div>
                      <div className="font-medium text-slate-600">Clique pour choisir un PDF</div>
                      <div className="text-xs text-slate-400 mt-1">Annonce SeLoger, LeBonCoin, PAP…</div>
                    </div>
                  )}
                </div>
              ) : (
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Colle ici le texte de l'annonce immobilière…"
                  className="w-full h-44 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === "review" && (
            <div className="space-y-5">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Localisation
                </div>
                <div className="space-y-2">
                  <Field label="Adresse" name="address" value={form.address} onChange={set} placeholder="12 rue de la Paix" />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Ville *" name="city" value={form.city} onChange={set} placeholder="Paris" />
                    <Field label="Code postal" name="postalCode" value={form.postalCode} onChange={set} placeholder="75001" />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Bien</div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Surface m² *" name="surface" value={form.surface} onChange={set} type="number" placeholder="65" />
                  <Field label="Pièces" name="rooms" value={form.rooms} onChange={set} type="number" placeholder="3" />
                  <Field label="Étage" name="floor" value={form.floor} onChange={set} type="number" placeholder="2" />
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Type</label>
                    <select value={form.type} onChange={(e) => set("type", e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
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

              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Finances (€)</div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prix de vente *" name="price" value={form.price} onChange={set} placeholder="250000" />
                  <Field label="Frais notaire" name="notaryFees" value={form.notaryFees} onChange={set} placeholder="auto 8%" />
                  <Field label="Travaux min" name="renovMin" value={form.renovMin} onChange={set} placeholder="10000" />
                  <Field label="Travaux max" name="renovMax" value={form.renovMax} onChange={set} placeholder="20000" />
                  <Field label="Loyer min /mois" name="rentMin" value={form.rentMin} onChange={set} placeholder="800" />
                  <Field label="Loyer max /mois" name="rentMax" value={form.rentMax} onChange={set} placeholder="950" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400" />
              </div>

              {rawText && (
                <div>
                  <button onClick={() => setShowRaw((s) => !s)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                    {showRaw ? "Masquer" : "Voir"} le texte brut extrait
                  </button>
                  {showRaw && (
                    <pre className="mt-2 text-xs bg-slate-50 rounded-lg p-3 overflow-auto max-h-28 whitespace-pre-wrap text-slate-500 border border-slate-100">
                      {rawText}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-6 mb-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 flex gap-2 shrink-0 border-t border-slate-100">
          {step === "review" && (
            <button onClick={() => { setStep("input"); setError(null); }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">
              ← Retour
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">
            Annuler
          </button>
          <button onClick={step === "input" ? handleExtract : handleSave} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors">
            {loading
              ? (step === "input" ? "Extraction…" : "Enregistrement…")
              : (step === "input" ? "Extraire les données →" : "Enregistrer le bien")}
          </button>
        </div>
      </div>
    </div>
  );
}
