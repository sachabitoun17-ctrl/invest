"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
type MobileTab = "list" | "map";

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
  { key: "yes", label: "Likes", dot: "bg-emerald-400" },
  { key: "undecided", label: "Attente", dot: "bg-amber-400" },
  { key: "no", label: "Rejetes", dot: "bg-red-400" },
];

const MEMBERS = [
  { name: "Sacha", color: "bg-blue-500" },
  { name: "Ilanna", color: "bg-pink-500" },
  { name: "Benjamin", color: "bg-violet-500" },
];

interface Props {
  initialProperties: PropertyWithVotes[];
}

export default function HomeClient({ initialProperties }: Props) {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyWithVotes[]>(initialProperties);
  const [selected, setSelected] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [mobileTab, setMobileTab] = useState<MobileTab>("list");
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      if (Array.isArray(data)) setProperties(data);
    } catch { /* ignore */ }
  }, []);

  async function handleSeed() {
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      if (data.properties?.length > 0) {
        setProperties(data.properties);
        router.refresh();
      } else {
        setSeedError("Aucun bien retourné. Recharge la page.");
      }
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : "Erreur inconnue");
    }
    setSeeding(false);
  }

  async function handleVote(propertyId: string, user: User, value: "yes" | "no" | "maybe") {
    const existing = properties.find((p) => p.id === propertyId)?.votes.find((v) => v.user === user);
    const method = existing?.value === value ? "DELETE" : "POST";
    await fetch(`/api/properties/${propertyId}/vote`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, value }),
    });
    await reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce bien ?")) return;
    await fetch(`/api/properties/${id}`, { method: "DELETE" });
    setProperties((prev) => prev.filter((p) => p.id !== id));
    if (selected === id) setSelected(null);
  }

  function handleSelect(id: string) {
    setSelected((prev) => (prev === id ? null : id));
    setMobileTab("list");
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

  const isEmpty = properties.length === 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50" style={{ fontFamily: "var(--font-inter)" }}>

      {/* ── Header ── */}
      <header className="bg-slate-900 text-white px-4 flex items-center gap-3 shrink-0 shadow-lg" style={{ height: "52px" }}>
        <div className="flex items-center gap-2.5">
          <BisLogo size={26} />
          <div className="leading-none">
            <div className="font-bold text-sm tracking-tight">BIS Project</div>
            <div className="text-slate-400 text-[9px] tracking-widest uppercase hidden sm:block">Investissement</div>
          </div>
        </div>

        <div className="w-px h-6 bg-slate-700 mx-0.5 hidden sm:block" />

        <div className="items-center gap-2 hidden sm:flex">
          {MEMBERS.map((m) => (
            <div key={m.name} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${m.color}`} />
              <span className="text-slate-300 text-xs">{m.name}</span>
            </div>
          ))}
        </div>

        <div className="items-center gap-1.5 ml-1 hidden md:flex">
          {stats.total > 0 && (
            <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">
              <b className="text-white">{stats.total}</b> biens
            </span>
          )}
          {stats.liked > 0 && (
            <span className="bg-emerald-900/60 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
              <b>{stats.liked}</b> likes
            </span>
          )}
          {stats.avgScore !== null && (
            <span className="bg-blue-900/60 text-blue-400 text-xs px-2 py-0.5 rounded-full">
              Score <b>{stats.avgScore}</b>
            </span>
          )}
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden sm:inline">Ajouter un bien</span>
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        <aside className={`
          flex flex-col bg-white border-r border-slate-200 overflow-hidden
          md:w-[400px] md:shrink-0
          ${mobileTab === "list" ? "flex w-full" : "hidden md:flex"}
        `}>
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <span className="text-[10px] text-slate-400 uppercase tracking-wide mr-1 shrink-0">Tri</span>
              {SORT_OPTIONS.map(({ key, label }) => (
                <button key={key} onClick={() => setSort(key)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    sort === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
                  }`}>{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <span className="text-[10px] text-slate-400 uppercase tracking-wide mr-1 shrink-0">Filtre</span>
              {FILTER_OPTIONS.map(({ key, label, dot }) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    filter === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
                  }`}>
                  {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-20 md:pb-3">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <div className="text-5xl mb-4">&#127960;</div>
                <div className="font-semibold text-slate-700 text-base">Aucun bien pour l&apos;instant</div>
                <div className="text-sm text-slate-400 mt-1 mb-6">Ajoute un bien ou charge des exemples</div>
                <button onClick={handleSeed} disabled={seeding}
                  className="bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                  {seeding ? "Chargement…" : "Voir 5 exemples"}
                </button>
                {seedError && (
                  <div className="mt-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{seedError}</div>
                )}
                <button onClick={() => setShowUpload(true)}
                  className="mt-2 text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2">
                  + Ajouter un vrai bien
                </button>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="text-4xl mb-3">&#128269;</div>
                <div className="font-semibold text-slate-700">Aucun bien dans ce filtre</div>
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

        <main className={`flex-1 relative ${mobileTab === "map" ? "flex w-full" : "hidden md:flex"}`}>
          {isEmpty ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
              <div className="text-center px-6">
                <div className="text-5xl mb-4">&#128506;</div>
                <div className="font-semibold text-slate-600">La carte apparaitra ici</div>
                <div className="text-slate-400 text-sm mt-1">Ajoute un bien pour voir les epingles</div>
              </div>
            </div>
          ) : (
            <Map properties={properties} selected={selected} onSelect={handleSelect} />
          )}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center shadow-lg" style={{ height: "56px", zIndex: 1000 }}>
        <button onClick={() => setMobileTab("list")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition-colors ${mobileTab === "list" ? "text-slate-900" : "text-slate-400"}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span>Liste</span>
          {mobileTab === "list" && <span className="absolute bottom-0 left-[8%] right-[58%] h-0.5 bg-slate-900 rounded-t" />}
        </button>
        <button onClick={() => setShowUpload(true)}
          className="mx-4 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 flex items-center justify-center text-white shadow-md transition-colors shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button onClick={() => setMobileTab("map")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition-colors ${mobileTab === "map" ? "text-slate-900" : "text-slate-400"}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>Carte</span>
          {mobileTab === "map" && <span className="absolute bottom-0 left-[58%] right-[8%] h-0.5 bg-slate-900 rounded-t" />}
        </button>
      </nav>

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
