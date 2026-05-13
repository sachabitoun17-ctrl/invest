"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import PropertyCard from "@/components/PropertyCard";
import UploadModal from "@/components/UploadModal";
import { PropertyWithVotes, computeMetrics, User } from "@/types/property";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-50 text-gray-400">
      Chargement de la carte…
    </div>
  ),
});

type SortKey = "score" | "yield" | "price" | "surface" | "date";

function sortProperties(
  props: PropertyWithVotes[],
  key: SortKey
): PropertyWithVotes[] {
  return [...props].sort((a, b) => {
    if (key === "date")
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (key === "price") return a.price - b.price;
    if (key === "surface") return b.surface - a.surface;
    if (key === "score") return computeMetrics(b).score - computeMetrics(a).score;
    if (key === "yield") {
      const ya = computeMetrics(a).yieldMin ?? 0;
      const yb = computeMetrics(b).yieldMin ?? 0;
      return yb - ya;
    }
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

export default function Home() {
  const [properties, setProperties] = useState<PropertyWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [filter, setFilter] = useState<"all" | "yes" | "no" | "undecided">("all");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/properties");
    const data = await res.json();
    setProperties(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVote(
    propertyId: string,
    user: User,
    value: "yes" | "no" | "maybe"
  ) {
    const existing = properties
      .find((p) => p.id === propertyId)
      ?.votes.find((v) => v.user === user);

    if (existing?.value === value) {
      await fetch(`/api/properties/${propertyId}/vote`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });
    } else {
      await fetch(`/api/properties/${propertyId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, value }),
      });
    }
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
    const yesVotes = p.votes.filter((v) => v.value === "yes").length;
    const noVotes = p.votes.filter((v) => v.value === "no").length;
    if (filter === "yes") return yesVotes >= 2;
    if (filter === "no") return noVotes >= 2;
    if (filter === "undecided") return yesVotes < 2 && noVotes < 2;
    return true;
  });

  const sorted = sortProperties(filtered, sort);

  const stats = {
    total: properties.length,
    avgScore:
      properties.length > 0
        ? Math.round(
            properties.reduce((s, p) => s + computeMetrics(p).score, 0) /
              properties.length
          )
        : 0,
    liked: properties.filter(
      (p) => p.votes.filter((v) => v.value === "yes").length >= 2
    ).length,
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏠</span>
          <div>
            <span className="font-bold text-gray-900">BIS Invest</span>
            <span className="text-xs text-gray-400 ml-2">
              Sacha · Ilanna · Benjamin
            </span>
          </div>
        </div>

        <div className="flex gap-2 text-xs text-gray-500 ml-4">
          <span className="bg-gray-100 rounded-full px-2 py-1">
            <b className="text-gray-800">{stats.total}</b> biens
          </span>
          {stats.liked > 0 && (
            <span className="bg-green-50 text-green-700 rounded-full px-2 py-1">
              <b>{stats.liked}</b> likés
            </span>
          )}
          {stats.avgScore > 0 && (
            <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-1">
              Score moyen <b>{stats.avgScore}</b>
            </span>
          )}
        </div>

        <div className="ml-auto">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            <span>Ajouter un bien</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: list */}
        <aside className="w-[400px] shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
          {/* Controls */}
          <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    sort === key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["all", "yes", "no", "undecided"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    filter === f
                      ? "bg-gray-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f === "all"
                    ? "Tous"
                    : f === "yes"
                    ? "✓ Likés"
                    : f === "no"
                    ? "✗ Rejetés"
                    : "? En attente"}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="text-center text-gray-400 mt-12 text-sm">
                Chargement…
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center mt-12">
                <div className="text-4xl mb-3">🏘️</div>
                <div className="text-gray-500 text-sm">
                  {properties.length === 0
                    ? "Aucun bien ajouté. Commence par uploader un PDF !"
                    : "Aucun bien dans ce filtre."}
                </div>
              </div>
            ) : (
              sorted.map((p) => (
                <div
                  key={p.id}
                  ref={(el) => {
                    cardRefs.current[p.id] = el;
                  }}
                >
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

        {/* Right: map */}
        <main className="flex-1 relative">
          {properties.length === 0 && !loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <div className="text-5xl mb-4">🗺️</div>
              <div className="text-lg font-medium">
                La carte s&apos;affichera ici
              </div>
              <div className="text-sm mt-1">
                Ajoute ton premier bien pour voir les épingles
              </div>
            </div>
          ) : (
            <Map
              properties={properties}
              selected={selected}
              onSelect={handleSelect}
            />
          )}
        </main>
      </div>

      {showUpload && (
        <UploadModal
          onAdded={(p) => {
            setProperties((prev) => [p, ...prev]);
            setSelected(p.id);
          }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
