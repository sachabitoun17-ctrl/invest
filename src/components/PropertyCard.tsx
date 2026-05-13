"use client";

import { PropertyWithVotes, computeMetrics, USERS, User } from "@/types/property";

const VOTE_ICON = { yes: "✓", no: "✗", maybe: "?" } as const;

const VOTE_ACTIVE: Record<string, string> = {
  yes: "bg-emerald-500 text-white ring-2 ring-emerald-200",
  no: "bg-red-500 text-white ring-2 ring-red-200",
  maybe: "bg-amber-400 text-white ring-2 ring-amber-200",
};

const VOTE_IDLE: Record<string, string> = {
  yes: "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600",
  no: "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500",
  maybe: "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500",
};

const USER_AVATAR: Record<string, string> = {
  sacha: "bg-blue-500",
  ilanna: "bg-pink-500",
  benjamin: "bg-violet-500",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200"
    : score >= 30 ? "text-orange-600 bg-orange-50 border-orange-200"
    : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className={`w-11 h-11 rounded-full border-2 flex flex-col items-center justify-center shrink-0 ${color}`}>
      <span className="text-sm font-bold leading-none">{score}</span>
      <span className="text-[8px] leading-none mt-0.5 opacity-60">score</span>
    </div>
  );
}

interface Props {
  property: PropertyWithVotes;
  selected: boolean;
  onSelect: () => void;
  onVote: (user: User, value: "yes" | "no" | "maybe") => void;
  onDelete: () => void;
}

export default function PropertyCard({ property: p, selected, onSelect, onVote, onDelete }: Props) {
  const m = computeMetrics(p);

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border bg-white transition-all duration-150 ${
        selected
          ? "border-blue-400 ring-2 ring-blue-100 shadow-md"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* ── Top row: address + score ── */}
      <div className="px-4 pt-3.5 pb-2 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {p.type && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {p.type}
              {p.floor != null ? ` · étage ${p.floor}` : ""}
            </span>
          )}
          <div className="font-semibold text-slate-900 text-sm truncate leading-snug">
            {p.address || p.city}
          </div>
          <div className="text-xs text-slate-400">
            {p.city}{p.postalCode ? ` ${p.postalCode}` : ""}
          </div>
        </div>
        <ScoreRing score={m.score} />
      </div>

      {/* ── Metrics grid ── */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        {[
          { label: "Surface", value: `${p.surface} m²`, sub: p.rooms ? `${p.rooms} pièces` : undefined },
          { label: "Prix", value: `${fmt(p.price)} €`, sub: `${fmt(m.pricePerM2)} €/m²` },
          {
            label: "Renta brute",
            value: m.yieldMin ? `${m.yieldMin.toFixed(1)}%` : "—",
            sub: m.yieldMax && m.yieldMax !== m.yieldMin ? `max ${m.yieldMax.toFixed(1)}%` : undefined,
            highlight: m.yieldMin ? (m.yieldMin >= 7 ? "text-emerald-600" : m.yieldMin >= 5 ? "text-amber-600" : "text-slate-700") : "",
          },
        ].map(({ label, value, sub, highlight }) => (
          <div key={label} className="bg-slate-50 rounded-lg px-2.5 py-2">
            <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
            <div className={`font-bold text-sm leading-tight ${highlight ?? "text-slate-800"}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Financials ── */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs border-t border-slate-100 pt-2.5">
        <div className="flex justify-between text-slate-500">
          <span>Notaire</span>
          <span className="font-medium text-slate-700">{fmt(p.notaryFees ?? p.price * 0.08)} €</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Travaux</span>
          <span className="font-medium text-slate-700">
            {p.renovMin != null
              ? `${fmt(p.renovMin)}${p.renovMax && p.renovMax !== p.renovMin ? `–${fmt(p.renovMax)}` : ""} €`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between text-slate-600 font-semibold">
          <span>Total</span>
          <span>{fmt(m.totalMin)}{m.totalMax !== m.totalMin ? `–${fmt(m.totalMax)}` : ""} €</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Loyer/mois</span>
          <span className="font-medium text-slate-700">
            {p.rentMin != null
              ? `${fmt(p.rentMin)}${p.rentMax && p.rentMax !== p.rentMin ? `–${fmt(p.rentMax)}` : ""} €`
              : "—"}
          </span>
        </div>
      </div>

      {/* ── Votes ── */}
      <div
        className="px-3 pb-3 pt-2 border-t border-slate-100 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {USERS.map((user) => {
          const vote = p.votes.find((v) => v.user === user);
          return (
            <div key={user} className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${USER_AVATAR[user]}`} />
                <span className="text-[10px] text-slate-400 capitalize">{user}</span>
              </div>
              <div className="flex gap-0.5">
                {(["yes", "no", "maybe"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => onVote(user, v)}
                    className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                      vote?.value === v ? VOTE_ACTIVE[v] : VOTE_IDLE[v]
                    }`}
                  >
                    {VOTE_ICON[v]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <button
          onClick={onDelete}
          className="ml-1 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-md transition-all text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* ── Description ── */}
      {p.description && (
        <div className="px-4 pb-3 text-xs text-slate-500 border-t border-slate-100 pt-2 leading-relaxed line-clamp-2">
          {p.description}
        </div>
      )}
    </div>
  );
}
