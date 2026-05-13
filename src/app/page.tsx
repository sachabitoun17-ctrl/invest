"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import PropertyCard from "@/components/PropertyCard";
import UploadModal from "@/components/UploadModal";
import BisLogo from "@/components/BisLogo";
import { PropertyWithVotes, computeMetrics, User } from "@/types/property";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-slate-50">
      <div className="text-slate-400 text-sm">Chargement de la carte…</div>
    </div>
  ),
});

type SortKey = "score" | "yield" | "price" | "surface" | "date";
type FilterKey = "all" | "yes" | "no" | "undecided";

function sortProperties(props: PropertyWithVotes[], key: SortKey) {
  return [...props].sort((a, b) => {
    if (key === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (key === "price") return a.price - b.price;
    if (key === "surface") return b.surface - a.surface;
    if (key === "score") return computeMetrics(b).score - computeMetrics(a).score;
    if (key === "yield") return (computeMetrics(b).yieldMin ?? 0) - (computeMetrics(a).yieldMin ?? 0);
    return 0;
  });
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "yield", label: "Renta" },
  { key: "price", label: "Prix" },
  { key: "surface", label: "Surface" },
  { key: "date", label: "Date" },
];

const FILTER_OPTIONS: { key: FilterKey; label: string; dot?: string }[] = [
  { key: "all", label: "Tous" },
  { key: "yes", label: "Likés", dot: "bg-emerald-400" },
  { key: "undecided", label: "En attente", dot: "bg-amber-400" },
  { key: "no", label: "Rejetés", dot: "bg-red-400" },
];

const MEMBERS = [
  { name: "Sacha", color: "bg-blue-500" },
  { name: "Ilanna", color: "bg-pink-500" },
  { name: "Benjamin", color: "bg-violet-500" },
];

export default function Home() {
  const [properties, setProperties] = useState<PropertyWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [filter, setFilter] = useState<FilterKey>("all");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      setProperties(Array.isArray(data) ? data : []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleVote(propertyId: string, user: User, value: "yes" | "no" | "maybe") {
    const existing = properties.find((p) => p.id === propertyId)?.votes.find((v) => v.user === user);
    const method = existing?.value === value ? "DELETE" : "POST";
    await fetch(`/api/properties/${propertyId}/vote`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, value }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce bien ?")) return;
    await fetch(`/api/properties/${id}`, { method: "DELETE" });
    setProperties((prev) => prev.filter((p) => p.id !== id));
    if (selected === id) setSelected(null);
  }

  function handleSelect(id: string) {
    setSelected((prev) => (prev === id ? null : id));
    setTimeout(() => {
      cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  const filtered = properties.filter((p) => {
    if (filter === "all") return true;
    const yes = p.votes.filter((v) => v.value === "yes").length;
    const no = p.votes.filter((v) => v.value === "no").length;
    if (filter === "yes") return yes >= 2;
    if (filter === "no") return no >= 2;
    if (filter === "undecided") return yes < 2 && no < 2;
    return true;
  });

  const sorted = sortProperties(filtered, sort);

  const stats = {
    total: properties.length,
    liked: properties.filter((p) => p.votes.filter((v) => v.value === "yes").length >= 2).length,
    avgScore: properties.length
      ? Math.round(properties.reduce((s, p) => s + computeMetrics(p).score, 0) / properties.length)
      : null,
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50" style={{ fontFamily: "var(--font-inter)" }}>

      <header className="bg-slate-900 text-white px-5 py-0 flex items-center gap-4 shrink-0 h-14 shadow-lg">
        <div className="flex items-center gap-3">
          <BisLogo size={30} />
          <div className="leading-none">
            <div className="font-bold text-base tracking-tight">BIS Project</div>
            <div className="text-slate-400 text-[10px] tracking-widest uppercase">Investissement</div>
          </div>
        </div>

        <div className="w-px h-7 bg-slate-700 ml-1" />

        <div className="flex items-center gap-2">
          {MEMBERS.map((m) => (
            <div key={m.name} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${m.color}`} />
              <span className="text-slate-300 text-xs">{m.name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-3">
          {stats.total > 0 && (
            <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full">
              <b className="text-white">{stats.total}</b> biens
            </span>
          )}
          {stats.liked > 0 && (
            <span className="bg-emerald-900/60 text-emerald-400 text-xs px-2.5 py-1 rounded-full">
              ✓ <b>{stats.liked}</b> likés
            </span>
          )}
          {stats.avgScore !== null && (
            <span className="bg-blue-900/60 text-blue-400 text-xs px-2.5 py-1 rounded-full">
              Score moy. <b>{stats.avgScore}</b>
            </span>
          )}
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Ajouter un bien
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <aside className="w-[400px] shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden shadow-sm">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wide mr-1 shrink-0">Tri</span>
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    sort === key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wide mr-1 shrink-0">Filtre</span>
              {FILTER_OPTIONS.map(({ key, label, dot }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    filter === key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="text-5xl mb-4">&#127960;</div>
                <div className="font-semibold text-slate-700">
                  {properties.length === 0 ? "Aucun bien pour l'instant" : "Aucun bien dans ce filtre"}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  {properties.length === 0 && "Commence par ajouter un bien via le bouton en haut"}
                </div>
              </div>
            ) : (
              sorted.map((p) => (
                <div key={p.id} ref={(el) => { cardRefs.current[p.id] = el; }}>
                  <PropertyCard
                    property={p}
                    selected={selected === p.id}
                    onSelect={() => handleSelect(p.id)}
                    onVote={(user, value) => handleVote(p.id, user, value)}
                    onDelete={() => handleDelete(p.id)}
                  />
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="flex-1 relative">
          {properties.length === 0 && !loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
              <div className="text-center">
                <div className="text-6xl mb-5">&#128506;</div>
                <div className="font-semibold text-slate-600 text-lg">La carte apparaîtra ici</div>
                <div className="text-slate-400 text-sm mt-1">
                  Ajoute ton premier bien pour voir les épingles
                </div>
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  + Ajouter un bien
                </button>
              </div>
            </div>
          ) : (
            <Map properties={properties} selected={selected} onSelect={handleSelect} />
          )}
        </main>
      </div>

      {showUpload && (
        <UploadModal
          onAdded={(newProps) => {
            setProperties((prev) => [...newProps, ...prev]);
            if (newProps.length > 0) setSelected(newProps[0].id);
          }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
