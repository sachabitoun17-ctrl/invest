"use client";

import BisLogo from "@/components/BisLogo";

const STEPS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Importer",
    desc: "PDF, URL ou texte — extraction auto des données",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Analyser",
    desc: "Score, rendement, décote marché calculés instantanément",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.25M6.633 10.5H4.875a2.25 2.25 0 00-2.25 2.25v4.5a2.25 2.25 0 002.25 2.25h2.25" />
      </svg>
    ),
    title: "Voter",
    desc: "Sacha, Ilanna et Benjamin votent sur chaque bien",
  },
];

const MEMBERS = [
  { name: "Sacha", color: "bg-blue-500" },
  { name: "Ilanna", color: "bg-pink-500" },
  { name: "Benjamin", color: "bg-violet-500" },
];

interface Props {
  seeding: boolean;
  seedError: string | null;
  onSeed: () => void;
  onAdd: () => void;
}

export default function WelcomePath({ seeding, seedError, onSeed, onAdd }: Props) {
  return (
    <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center px-6 overflow-y-auto">
      <div className="w-full max-w-lg py-10 flex flex-col items-center gap-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <BisLogo size={52} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">BIS Project</h1>
            <p className="text-slate-500 text-sm mt-1">Outil d&apos;analyse immobilière collaborative</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {MEMBERS.map((m) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${m.color}`} />
                <span className="text-slate-500 text-sm">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="w-full grid grid-cols-3 gap-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex flex-col items-center text-center gap-2 bg-slate-50 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                {s.icon}
              </div>
              <div className="font-semibold text-slate-800 text-sm">{s.title}</div>
              <div className="text-xs text-slate-400 leading-relaxed">{s.desc}</div>
              {i < STEPS.length - 1 && (
                <span className="hidden" />
              )}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onAdd}
            className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un premier bien
          </button>

          <button
            onClick={onSeed}
            disabled={seeding}
            className="w-full py-3 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-medium text-sm transition-colors"
          >
            {seeding ? "Chargement des exemples…" : "Voir 10 biens exemples"}
          </button>

          {seedError && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl text-center">
              {seedError}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center max-w-xs">
          Budget cible 100k–800k€ &middot; Stratégie A (revente) ou B (locatif) &middot; Paris et banlieue
        </p>
      </div>
    </div>
  );
}
