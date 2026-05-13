"use client";

import { PropertyWithVotes, computeMetrics, USERS, User } from "@/types/property";

const VOTE_LABELS = { yes: "✓", no: "✗", maybe: "?" } as const;
const VOTE_COLORS = {
  yes: "bg-green-500 text-white",
  no: "bg-red-500 text-white",
  maybe: "bg-yellow-400 text-white",
} as const;
const VOTE_HOVER = {
  yes: "hover:bg-green-100",
  no: "hover:bg-red-100",
  maybe: "hover:bg-yellow-100",
} as const;

const USER_COLORS: Record<User, string> = {
  sacha: "bg-blue-500",
  ilanna: "bg-pink-500",
  benjamin: "bg-purple-500",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-100 text-green-800"
      : score >= 50
      ? "bg-yellow-100 text-yellow-800"
      : score >= 30
      ? "bg-orange-100 text-orange-800"
      : "bg-red-100 text-red-800";
  return (
    <span className={`text-lg font-bold px-3 py-1 rounded-full ${color}`}>
      {score}
    </span>
  );
}

interface Props {
  property: PropertyWithVotes;
  selected: boolean;
  onSelect: () => void;
  onVote: (user: User, value: "yes" | "no" | "maybe") => void;
  onDelete: () => void;
}

export default function PropertyCard({
  property: p,
  selected,
  onSelect,
  onVote,
  onDelete,
}: Props) {
  const m = computeMetrics(p);

  const getVote = (user: User) => p.votes.find((v) => v.user === user);

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {p.type && (
                <span className="text-xs uppercase tracking-wide text-gray-400 font-medium">
                  {p.type}
                </span>
              )}
            </div>
            <div className="font-semibold text-gray-900 truncate">{p.address}</div>
            <div className="text-sm text-gray-500">
              {p.city}
              {p.postalCode ? ` (${p.postalCode})` : ""}
            </div>
          </div>
          <ScoreBadge score={m.score} />
        </div>
      </div>

      {/* Key metrics */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-xs text-gray-400">Surface</div>
          <div className="font-semibold">{p.surface} m²</div>
          {p.rooms && <div className="text-xs text-gray-400">{p.rooms} pièces</div>}
        </div>
        <div>
          <div className="text-xs text-gray-400">Prix</div>
          <div className="font-semibold">{fmt(p.price)} €</div>
          <div className="text-xs text-gray-400">{fmt(m.pricePerM2)} €/m²</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Renta brute</div>
          {m.yieldMin ? (
            <div className="font-semibold text-green-700">
              {m.yieldMin.toFixed(1)}%
              {m.yieldMax && m.yieldMax !== m.yieldMin
                ? `–${m.yieldMax.toFixed(1)}%`
                : ""}
            </div>
          ) : (
            <div className="text-gray-400">—</div>
          )}
        </div>
      </div>

      {/* Financials breakdown */}
      <div className="px-4 pb-3 border-t border-gray-100 pt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Notaire (~8%)</span>
          <span>{fmt(p.notaryFees ?? p.price * 0.08)} €</span>
        </div>
        <div className="flex justify-between">
          <span>Travaux</span>
          <span>
            {p.renovMin != null
              ? `${fmt(p.renovMin)}${p.renovMax && p.renovMax !== p.renovMin ? `–${fmt(p.renovMax)}` : ""} €`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between font-medium text-gray-800">
          <span>Total investi</span>
          <span>
            {fmt(m.totalMin)}
            {m.totalMax !== m.totalMin ? `–${fmt(m.totalMax)}` : ""} €
          </span>
        </div>
        <div className="flex justify-between">
          <span>Loyer estimé</span>
          <span>
            {p.rentMin != null
              ? `${fmt(p.rentMin)}${p.rentMax && p.rentMax !== p.rentMin ? `–${fmt(p.rentMax)}` : ""} €/mo`
              : "—"}
          </span>
        </div>
      </div>

      {/* Votes */}
      <div
        className="px-4 pb-4 pt-2 border-t border-gray-100 flex items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {USERS.map((user) => {
          const vote = getVote(user);
          return (
            <div key={user} className="flex-1">
              <div className="text-xs text-gray-400 mb-1 capitalize flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${USER_COLORS[user]}`} />
                {user}
              </div>
              <div className="flex gap-1">
                {(["yes", "no", "maybe"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => onVote(user, v)}
                    className={`w-7 h-7 rounded text-sm font-bold transition-colors ${
                      vote?.value === v
                        ? VOTE_COLORS[v]
                        : `bg-gray-100 text-gray-400 ${VOTE_HOVER[v]}`
                    }`}
                    title={v}
                  >
                    {VOTE_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <button
          onClick={onDelete}
          className="ml-auto text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
          title="Supprimer"
        >
          ×
        </button>
      </div>

      {/* Description */}
      {p.description && (
        <div className="px-4 pb-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
          {p.description}
        </div>
      )}
    </div>
  );
}
