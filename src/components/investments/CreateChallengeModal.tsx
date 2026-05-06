"use client";

import { useState } from "react";
import { X, Briefcase, Zap, Shuffle } from "lucide-react";

interface Props {
  onClose: () => void;
  onCreated: (challenge: unknown) => void;
}

const STYLES: { value: "INVESTMENT" | "TRADING" | "MIXED"; label: string; desc: string; Icon: typeof Briefcase; color: string }[] = [
  { value: "INVESTMENT", label: "Investment", desc: "Buy & hold, longer horizon",  Icon: Briefcase, color: "#3b82f6" },
  { value: "TRADING",    label: "Trading",    desc: "Active, frequent positions", Icon: Zap,       color: "#f59e0b" },
  { value: "MIXED",      label: "Mixed",      desc: "Anything goes",              Icon: Shuffle,   color: "#10b981" },
];

export default function CreateChallengeModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "PUBLIC",
    style: "MIXED",
    password: "",
    startDate: "",
    endDate: "",
    virtualCapital: "100000",
    assetClasses: ["crypto", "stocks"],
    maxParticipants: "",
    leaderboardVisible: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleAsset = (asset: string) => {
    setForm((f) => ({
      ...f,
      assetClasses: f.assetClasses.includes(asset)
        ? f.assetClasses.filter((a) => a !== asset)
        : [...f.assetClasses, asset],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required");
    if (!form.startDate || !form.endDate) return setError("Dates are required");
    if (form.assetClasses.length === 0) return setError("Select at least one asset class");

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          virtualCapital: Number(form.virtualCapital),
          maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
        }),
      });
      // Defensive parse — server may return empty body on a 500
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
      onCreated(data.challenge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create challenge");
    } finally {
      setLoading(false);
    }
  };

  const assets = ["crypto", "stocks", "forex", "commodities"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-xl p-6 relative overflow-y-auto max-h-[90vh]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold mb-5">Create Challenge</h2>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Challenge Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Bull Market Showdown"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Optional description..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Challenge Style *</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map(({ value, label, desc, Icon, color }) => {
                const active = form.style === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, style: value }))}
                    className="rounded-lg p-2.5 text-left transition-all"
                    style={{
                      background: active ? `${color}1f` : "var(--bg-base)",
                      border: `1px solid ${active ? color : "var(--border)"}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={13} style={{ color: active ? color : "var(--text-secondary)" }} />
                      <span className="text-xs font-semibold" style={{ color: active ? color : "var(--text-primary)" }}>
                        {label}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 leading-snug">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">Start Date *</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", colorScheme: "dark" }}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">End Date *</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", colorScheme: "dark" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">Virtual Capital ($)</label>
              <input
                type="number"
                value={form.virtualCapital}
                onChange={(e) => setForm((f) => ({ ...f, virtualCapital: e.target.value }))}
                min="1000"
                step="1000"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Max Participants</label>
              <input
                type="number"
                value={form.maxParticipants}
                onChange={(e) => setForm((f) => ({ ...f, maxParticipants: e.target.value }))}
                placeholder="Unlimited"
                min="2"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Asset Classes *</label>
            <div className="flex flex-wrap gap-2">
              {assets.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAsset(a)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
                  style={{
                    background: form.assetClasses.includes(a) ? "var(--accent)" : "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: form.assetClasses.includes(a) ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Visibility</label>
            <div className="flex gap-2">
              {(["PUBLIC", "PASSWORD_PROTECTED", "PRIVATE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: form.type === t ? "var(--accent)" : "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: form.type === t ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {t === "PUBLIC" ? "Public" : t === "PRIVATE" ? "Private" : "Protected"}
                </button>
              ))}
            </div>
          </div>

          {form.type === "PASSWORD_PROTECTED" && (
            <div>
              <label className="block text-sm text-white/60 mb-1">Password *</label>
              <input
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                type="password"
                placeholder="Join password..."
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.leaderboardVisible}
              onChange={(e) => setForm((f) => ({ ...f, leaderboardVisible: e.target.checked }))}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-sm text-white/70">Public leaderboard</span>
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading ? "Creating..." : "Create Challenge"}
          </button>
        </form>
      </div>
    </div>
  );
}
