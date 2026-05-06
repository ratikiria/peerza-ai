"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trophy, Sparkles, Users, Flame, Calendar } from "lucide-react";
import ChallengeCard from "@/components/investments/ChallengeCard";
import CreateChallengeModal from "@/components/investments/CreateChallengeModal";
import JoinChallengeModal from "@/components/investments/JoinChallengeModal";

type Challenge = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  virtualCapital: number;
  assetClasses: string[];
  maxParticipants: number | null;
  _count: { participants: number };
  creator: { username: string; name: string };
  participants: { id: string }[];
};

type Filter = "all" | "ACTIVE" | "UPCOMING" | "ENDED" | "mine";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Live", value: "ACTIVE" },
  { label: "Upcoming", value: "UPCOMING" },
  { label: "Ended", value: "ENDED" },
  { label: "My Challenges", value: "mine" },
];

export default function InvestmentsPage() {
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [mineChallenges, setMineChallenges] = useState<Challenge[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinTarget, setJoinTarget] = useState<Challenge | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, mineRes] = await Promise.all([
        fetch("/api/challenges").then((r) => r.json()),
        fetch("/api/challenges?type=mine").then((r) => r.json()),
      ]);
      setAllChallenges(allRes.challenges ?? []);
      setMineChallenges(mineRes.challenges ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreated = (challenge: unknown) => {
    setShowCreate(false);
    const c = challenge as Challenge;
    window.location.href = `/investments/${c.id}`;
  };

  const counts = useMemo(() => {
    return {
      all: allChallenges.length,
      ACTIVE: allChallenges.filter((c) => c.status === "ACTIVE").length,
      UPCOMING: allChallenges.filter((c) => c.status === "UPCOMING").length,
      ENDED: allChallenges.filter((c) => c.status === "ENDED").length,
      mine: mineChallenges.length,
    };
  }, [allChallenges, mineChallenges]);

  const totalPlayers = useMemo(() => {
    return allChallenges.reduce((s, c) => s + (c._count?.participants ?? 0), 0);
  }, [allChallenges]);

  const visible = useMemo(() => {
    if (filter === "mine") return mineChallenges;
    if (filter === "all") return allChallenges;
    return allChallenges.filter((c) => c.status === filter);
  }, [filter, allChallenges, mineChallenges]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 mb-8 bg-gradient-to-br from-emerald-950/60 via-gray-950 to-indigo-950/40">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl animate-[pz-blob_12s_ease-in-out_infinite]" />
          <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-[pz-blob2_14s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl animate-[pz-blob3_16s_ease-in-out_infinite]" />
        </div>

        <div className="relative p-8 sm:p-12">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles size={12} /> Pillar 2 — Live arena
            </span>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-4 py-2.5 text-sm transition-colors shadow-lg shadow-emerald-500/30"
            >
              <Plus size={16} /> Create Challenge
            </button>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <Trophy size={28} className="text-gray-950" />
              <span className="absolute -inset-1 rounded-2xl bg-emerald-400/30 blur-md -z-10 animate-[pz-glow_3s_ease-in-out_infinite]" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-50 tracking-tight leading-none">
                INVESTMENTS
              </h1>
              <p className="text-sm text-emerald-300/80 font-medium mt-1">
                Compete with real prices. Real-time leaderboards.
              </p>
            </div>
          </div>

          <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed mb-6">
            Trade against your friends with simulated capital. Pick your strategy, track your edge, climb the board.
          </p>

          {/* Stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                <Flame size={10} className="text-rose-400" /> Live now
              </div>
              <p className="text-xl font-black text-rose-400 tabular-nums">{counts.ACTIVE}</p>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                <Calendar size={10} className="text-amber-400" /> Upcoming
              </div>
              <p className="text-xl font-black text-amber-300 tabular-nums">{counts.UPCOMING}</p>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                <Users size={10} className="text-emerald-400" /> Players
              </div>
              <p className="text-xl font-black text-emerald-400 tabular-nums">{totalPlayers}</p>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                <Trophy size={10} className="text-indigo-400" /> Your challenges
              </div>
              <p className="text-xl font-black text-indigo-300 tabular-nums">{counts.mine}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-5 px-1 flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const count = counts[f.value];
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-emerald-500 border-emerald-400 text-gray-950 shadow-lg shadow-emerald-500/30"
                  : "bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-700"
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full ${
                  active ? "bg-gray-950/20 text-gray-950" : "bg-gray-800 text-gray-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-xl animate-pulse"
              style={{ background: "var(--bg-card)" }}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-12 text-center">
          <Trophy size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-sm text-gray-400 mb-4">
            {filter === "mine"
              ? "You haven't joined any challenges yet."
              : filter === "ACTIVE"
                ? "No live challenges right now."
                : filter === "UPCOMING"
                  ? "No upcoming challenges."
                  : filter === "ENDED"
                    ? "No ended challenges to show."
                    : "No challenges yet — be the first."}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-5 py-2.5 text-sm transition-colors"
          >
            <Plus size={14} /> Create the first one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((c) => (
            <ChallengeCard key={c.id} challenge={c} onJoin={setJoinTarget} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateChallengeModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {joinTarget && (
        <JoinChallengeModal
          challenge={joinTarget}
          onClose={() => setJoinTarget(null)}
        />
      )}

      <style>{`
        @keyframes pz-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 30px) scale(1.1); }
        }
        @keyframes pz-blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.08); }
        }
        @keyframes pz-blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -25px) scale(0.92); }
        }
        @keyframes pz-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
