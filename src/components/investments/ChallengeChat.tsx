"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { Send, Loader2, MessageCircle, User as UserIcon, Lock, Smile } from "lucide-react";

// Lazy-loaded emoji picker — same pattern as ChatWindow
const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => ({ default: m.default as unknown as React.ComponentType<Record<string, unknown>> })),
  { ssr: false }
);

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    name: string;
    image: string | null;
  };
}

interface Props {
  challengeId: string;
  isParticipant: boolean;
}

const POLL_INTERVAL_MS = 8000;

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChallengeChat({ challengeId, isParticipant }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiData, setEmojiData] = useState<unknown>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const lastSeenIdRef = useRef<string | null>(null);

  // Lazy-load emoji-mart data once the picker is opened
  useEffect(() => {
    if (!showEmoji || emojiData) return;
    import("@emoji-mart/data").then((m) => setEmojiData(m.default));
  }, [showEmoji, emojiData]);

  // Click outside closes the emoji picker
  useEffect(() => {
    if (!showEmoji) return;
    function handle(e: MouseEvent) {
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showEmoji]);

  function insertEmoji(native: string) {
    const input = inputRef.current;
    if (!input) {
      setDraft((d) => d + native);
      return;
    }
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + native + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + native.length;
      input.setSelectionRange(pos, pos);
    });
  }

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/chat`);
      if (!res.ok) {
        if (res.status === 403) setErr("locked");
        else setErr("load_error");
        return;
      }
      const data = await res.json();
      const next = (data.messages ?? []) as ChatMessage[];
      if (data.currentUserId) setCurrentUserId(data.currentUserId);
      const lastId = next[next.length - 1]?.id ?? null;
      // Only set state when we actually got new content to avoid scroll jank
      if (lastId !== lastSeenIdRef.current || next.length !== messages.length) {
        setMessages(next);
        lastSeenIdRef.current = lastId;
      }
      setErr(null);
    } catch {
      setErr("network_error");
    } finally {
      setLoading(false);
    }
  // messages.length intentionally excluded — including it would cause an
  // infinite re-fetch loop because fetchMessages updates messages.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  useEffect(() => {
    if (!isParticipant) { setLoading(false); return; }
    fetchMessages();
    const iv = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchMessages, isParticipant]);

  // Auto-scroll to the bottom whenever messages change. We use scrollHeight so
  // the latest message is in view; users can scroll up to read history and
  // we won't fight them because we only re-pin on length change.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setErr(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error ? String(data.error) : "send_failed");
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
    } catch {
      setErr("network_error");
    } finally {
      setSending(false);
    }
  }

  // Non-participant: show a locked state instead of the chat
  if (!isParticipant) {
    return (
      <div className="rounded-xl p-5 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <Lock size={16} className="text-amber-400" />
        </div>
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Chat is for participants
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Join this challenge from the lobby to chat with the other players in real time.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", height: 480 }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
          <MessageCircle size={13} className="text-emerald-400" />
          Challenge Chat
        </h3>
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
          Participants only
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
        style={{ scrollbarWidth: "thin" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              No messages yet — say something to break the ice 👋
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.author.id === currentUserId;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Link href={`/profile/${m.author.username}`}
                  className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center hover:opacity-90"
                  style={{ background: "rgba(16,185,129,0.15)" }}>
                  {m.author.image
                    ? <Image src={m.author.image} alt={m.author.name} width={28} height={28} className="object-cover" />
                    : <UserIcon size={12} className="text-emerald-400" />}
                </Link>
                <div className={`flex-1 min-w-0 ${mine ? "text-right" : ""}`}>
                  {!mine && (
                    <Link href={`/profile/${m.author.username}`}
                      className="text-[10px] font-semibold hover:text-emerald-400 transition-colors"
                      style={{ color: "var(--text-primary)" }}>
                      {m.author.name}
                    </Link>
                  )}
                  <div
                    className={`inline-block max-w-[85%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed mt-0.5 ${mine ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={mine
                      ? { background: "#10b981", color: "#0f1117" }
                      : { background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                  >
                    <span className="whitespace-pre-wrap break-words">{m.body}</span>
                  </div>
                  <div className="text-[9px] mt-0.5 tabular-nums" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                    {timeAgo(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="relative px-3 py-2.5 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          placeholder="Message participants…"
          className="flex-1 text-xs pl-3 pr-9 py-2 rounded-xl outline-none transition-all"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          onFocus={(e) => (e.target.style.borderColor = "#10b981")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          disabled={sending}
        />
        {/* Emoji toggle — sits inside the input visually */}
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="absolute right-[58px] w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--bg-card)]"
          style={{ color: showEmoji ? "#10b981" : "var(--text-secondary)" }}
          aria-label="Add emoji"
          tabIndex={-1}
        >
          <Smile size={15} />
        </button>
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-30 flex-shrink-0"
          style={{ background: "#10b981", color: "#0f1117" }}
          aria-label="Send"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>

        {showEmoji && emojiData && (
          <div
            ref={emojiContainerRef}
            className="absolute bottom-full mb-2 right-0 z-50 rounded-2xl shadow-2xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <EmojiPicker
              data={emojiData as Record<string, unknown>}
              theme="dark"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={1}
              perLine={8}
              onEmojiSelect={(emoji: { native: string }) => insertEmoji(emoji.native)}
            />
          </div>
        )}
      </form>

      {err && err !== "load_error" && (
        <div className="px-3 pb-2 text-[10px]" style={{ color: "#fca5a5" }}>
          {err === "send_failed" ? "Couldn't send — try again." :
           err === "network_error" ? "Network error." :
           err === "message_too_long" ? "Message too long." :
           "Something went wrong."}
        </div>
      )}
    </div>
  );
}
