"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Lock, Globe, Calendar, TrendingUp, Briefcase, Zap, Shuffle, Share2 } from "lucide-react";
import ShareModal from "@/components/shared/ShareModal";

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
  _count: { participants: number };
  creator: { username: string; name: string };
  participants: { id: string }[];
}

const STYLE_META: Record<string, { label: string; color: string; Icon: typeof Briefcase }> = {
  INVESTMENT: { label: "Investment", color: "#3b82f6", Icon: Briefcase },
  TRADING:    { label: "Trading",    color: "#f59e0b", Icon: Zap },
  MIXED:      { label: "Mixed",      color: "#10b981", Icon: Shuffle },
};

interface Props {
  challenge: Challenge;
  onJoin: (challenge: Challenge) => void;
}

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

export default function ChallengeCard({ challenge, onJoin }: Props) {
  const router = useRouter();
  const isParticipant = challenge.participants.length > 0;
  const [shareOpen, setShareOpen] = useState(false);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 cursor-pointer transition-colors hover:border-white/20"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      onClick={() => isParticipant && router.push(`/investments/${challenge.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: meta.color + "22", color: meta.color }}
                >
                  <Icon size={9} />
                  {meta.label}
                </span>
              );
            })()}
            {challenge.type === "PASSWORD_PROTECTED" && (
              <Lock size={12} className="text-white/40" />
            )}
            {challenge.type === "PUBLIC" && (
              <Globe size={12} className="text-white/40" />
            )}
          </div>
          <h3 className="font-semibold text-sm leading-tight truncate">{challenge.name}</h3>
          <p className="text-xs text-white/40 mt-0.5">by @{challenge.creator.username}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShareOpen(true); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            title="Share challenge"
          >
            <Share2 size={12} />
          </button>
          <div className="text-right">
            <div className="text-sm font-bold text-green-400">
              ${challenge.virtualCapital.toLocaleString()}
            </div>
            <div className="text-xs text-white/40">virtual capital</div>
          </div>
        </div>
      </div>

      {/* Description */}
      {challenge.description && (
        <p className="text-xs text-white/50 line-clamp-2">{challenge.description}</p>
      )}

      {/* Asset classes */}
      <div className="flex flex-wrap gap-1">
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

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-white/40 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-1">
          <Calendar size={11} />
          {fmt(challenge.startDate)} – {fmt(challenge.endDate)}
        </div>
        <div className="flex items-center gap-1">
          <Users size={11} />
          {challenge._count.participants}
          {challenge.maxParticipants ? `/${challenge.maxParticipants}` : ""}
        </div>
      </div>

      {/* Action */}
      <button
        className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{
          background: isParticipant ? "var(--bg-base)" : "var(--accent)",
          color: isParticipant ? "var(--text-secondary)" : "#fff",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isParticipant) {
            router.push(`/investments/${challenge.id}`);
          } else if (challenge.status !== "ENDED") {
            onJoin(challenge);
          }
        }}
      >
        {isParticipant ? (
          <span className="flex items-center justify-center gap-1.5">
            <TrendingUp size={14} /> View Portfolio
          </span>
        ) : challenge.status === "ENDED" ? (
          "Ended"
        ) : (
          "Join Challenge"
        )}
      </button>

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
