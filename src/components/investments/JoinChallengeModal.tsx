"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Lock } from "lucide-react";

interface Challenge {
  id: string;
  name: string;
  type: string;
  virtualCapital: number;
}

interface Props {
  challenge: Challenge;
  onClose: () => void;
}

export default function JoinChallengeModal({ challenge, onClose }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const join = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      router.push(`/investments/${challenge.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-xl p-6 relative" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold mb-1">Join Challenge</h2>
        <p className="text-sm text-white/50 mb-5">{challenge.name}</p>

        <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: "var(--bg-base)" }}>
          <div className="flex justify-between">
            <span className="text-white/50">Starting capital</span>
            <span className="font-semibold text-green-400">${challenge.virtualCapital.toLocaleString()}</span>
          </div>
        </div>

        {challenge.type === "PASSWORD_PROTECTED" && (
          <div className="mb-4">
            <label className="block text-sm text-white/60 mb-1 flex items-center gap-1.5">
              <Lock size={12} /> Password required
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter challenge password..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
              onKeyDown={(e) => e.key === "Enter" && join()}
            />
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={join}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading ? "Joining..." : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
