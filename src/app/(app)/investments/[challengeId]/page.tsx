"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Calendar, Trophy, Lock, Globe, Briefcase, Zap, Shuffle, Share2 } from "lucide-react";
import PortfolioView from "@/components/investments/PortfolioView";
import TradeForm from "@/components/investments/TradeForm";
import Leaderboard from "@/components/investments/Leaderboard";
import ActivityFeed from "@/components/investments/ActivityFeed";
import ChallengeChat from "@/components/investments/ChallengeChat";
import ShareModal, { type SharePayload } from "@/components/shared/ShareModal";

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  type: string;
  style?: string;
  status: string;
  startDate: string;
  endDate: string;
  virtualCapital: number;
  assetClasses: string[];
  maxParticipants: number | null;
  leaderboardVisible: boolean;
  _count: { participants: number };
  creator: { id: string; username: string; name: string };
  participants: { id: string; cashBalance: number }[];
}

const STYLE_META: Record<string, { label: string; color: string; Icon: typeof Briefcase }> = {
  INVESTMENT: { label: "Investment", color: "#3b82f6", Icon: Briefcase },
  TRADING:    { label: "Trading",    color: "#f59e0b", Icon: Zap },
  MIXED:      { label: "Mixed",      color: "#10b981", Icon: Shuffle },
};

const statusColor: Record<string, string> = {
  UPCOMING: "#f59e0b",
  ACTIVE: "#22c55e",
  ENDED: "#6b7280",
};

const statusLabel: Record<string, string> = {
  UPCOMING: "Upcoming",
  ACTIVE: "Live",
  ENDED: "Ended",
};

export default function ChallengePage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = use(params);
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"portfolio" | "leaderboard">("portfolio");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  const fetchChallenge = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}`);
      const data = await res.json();
      if (!res.ok) {
        router.push("/investments");
        return;
      }
      setChallenge(data.challenge);
    } finally {
      setLoading(false);
    }
  }, [challengeId, router]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const onTraded = () => setRefreshTrigger((n) => n + 1);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="h-32 rounded-xl animate-pulse" style={{ background: "var(--bg-card)" }} />
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  const isParticipant = challenge.participants.length > 0;
  const isActive = challenge.status === "ACTIVE";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back + Share */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/investments")}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Challenges
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          >
            <Share2 size={13} /> Share
          </button>
        </div>

        {/* Challenge header */}
        <div className="rounded-xl p-5 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: statusColor[challenge.status] + "22", color: statusColor[challenge.status] }}
                >
                  {statusLabel[challenge.status]}
                </span>
                {challenge.style && STYLE_META[challenge.style] && (() => {
                  const meta = STYLE_META[challenge.style];
                  const Icon = meta.Icon;
                  return (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: meta.color + "22", color: meta.color }}
                    >
                      <Icon size={11} />
                      {meta.label}
                    </span>
                  );
                })()}
                {challenge.type === "PASSWORD_PROTECTED" ? (
                  <Lock size={12} className="text-white/30" />
                ) : (
                  <Globe size={12} className="text-white/30" />
                )}
                {challenge.assetClasses.map((a) => (
                  <span
                    key={a}
                    className="text-xs px-2 py-0.5 rounded-full capitalize"
                    style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}
                  >
                    {a}
                  </span>
                ))}
              </div>
              <h1 className="text-xl font-bold mb-1">{challenge.name}</h1>
              {challenge.description && (
                <p className="text-sm text-white/50 mb-2">{challenge.description}</p>
              )}
              <p className="text-xs text-white/30">Created by @{challenge.creator.username}</p>
            </div>
            <div className="flex gap-4 shrink-0">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">
                  ${challenge.virtualCapital.toLocaleString()}
                </div>
                <div className="text-xs text-white/40">Virtual Capital</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-lg font-bold justify-center">
                  <Users size={16} />
                  {challenge._count.participants}
                </div>
                <div className="text-xs text-white/40">
                  {challenge.maxParticipants ? `/ ${challenge.maxParticipants} max` : "Participants"}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/30 mt-3">
            <Calendar size={11} />
            {fmt(challenge.startDate)} – {fmt(challenge.endDate)}
          </div>
        </div>

        {/* Not joined warning */}
        {!isParticipant && (
          <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ background: "#f59e0b11", border: "1px solid #f59e0b33" }}>
            <Trophy size={16} style={{ color: "#f59e0b" }} />
            <p className="text-sm text-white/70">You are not a participant in this challenge. Join from the lobby to trade.</p>
          </div>
        )}

        {/* Mobile tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit lg:hidden" style={{ background: "var(--bg-card)" }}>
          <button
            onClick={() => setActiveTab("portfolio")}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: activeTab === "portfolio" ? "var(--accent)" : "transparent",
              color: activeTab === "portfolio" ? "#fff" : "var(--text-secondary)",
            }}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: activeTab === "leaderboard" ? "var(--accent)" : "transparent",
              color: activeTab === "leaderboard" ? "#fff" : "var(--text-secondary)",
            }}
          >
            Leaderboard
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-5">
          {/* Left: Portfolio + Trade */}
          <div className={`flex-1 space-y-4 ${activeTab === "leaderboard" ? "hidden lg:block" : ""}`}>
            {isParticipant && (
              <PortfolioView
                challengeId={challengeId}
                virtualCapital={challenge.virtualCapital}
                refreshTrigger={refreshTrigger}
              />
            )}
            {isParticipant && isActive && (
              <TradeForm
                challengeId={challengeId}
                allowedAssetClasses={challenge.assetClasses}
                onTraded={onTraded}
              />
            )}
          </div>

          {/* Right: Leaderboard + Chat + Activity (chat is always-visible now;
              Activity used to share a tab with Chat but users were missing it) */}
          <div className={`w-80 shrink-0 space-y-4 ${activeTab === "portfolio" ? "hidden lg:block" : ""}`}>
            <Leaderboard challengeId={challengeId} refreshTrigger={refreshTrigger} />
            <ChallengeChat challengeId={challengeId} isParticipant={isParticipant} />
            <ActivityFeed challengeId={challengeId} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        payload={{
          kind: "challenge",
          challenge: {
            id: challenge.id,
            name: challenge.name,
            style: challenge.style as "INVESTMENT" | "TRADING" | "MIXED" | undefined,
            status: challenge.status as "UPCOMING" | "ACTIVE" | "ENDED",
            participantCount: challenge._count.participants,
          },
        }}
      />
    </div>
  );
}
