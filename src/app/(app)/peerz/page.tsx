import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ink } from "@/lib/ink"
import { ensureGenesis } from "@/lib/peerz-server"
import {
  CHECKIN_REWARDS, DUEL_WIN_PEERZ, GENESIS_LIMIT, GENESIS_MULT, HOT_HAND_MIN_STREAK, HOT_HAND_MULT,
  LEDGER_LABELS, RESOLVED_DAILY_CAP, RESOLVED_PEERZ, STORE_ITEMS, TIER_MULT, formatPeerz, hitBasePeerz,
  seasonAt, type RewardPart,
} from "@/lib/peerz"
import PeerzCoin from "@/components/peerz/PeerzCoin"
import PeerzStore from "@/components/peerz/PeerzStore"

export const metadata = { title: "Peerz · Peerza.ai" }

const card = { background: "var(--glass)", border: "1px solid var(--glass-border)" }

function detailOf(reason: string, meta: unknown): string {
  const m = (meta ?? {}) as {
    ticker?: string; parts?: RewardPart[]; hit?: boolean; gameId?: string; streak?: number; name?: string
  }
  switch (reason) {
    case "CALL_HIT":
      return [m.ticker, ...(m.parts ?? []).slice(1).map((p) => `${p.label} ${p.value}`)].filter(Boolean).join(" · ")
    case "CALL_RESOLVED":
      return [m.ticker, m.hit ? "hit" : "missed"].filter(Boolean).join(" · ")
    case "DUEL_WIN":
      return (m.gameId ?? "").replace(/-/g, " ")
    case "CHECKIN":
      return m.streak ? `Day ${m.streak} of 7` : ""
    case "REDEEM":
      return m.name ?? ""
    default:
      return ""
  }
}

function when(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function PeerzPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const userId = session.user.id

  const genesisNo = await ensureGenesis(userId)
  const season = seasonAt()
  const [me, lifetime, thisSeason, ledger] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        peerzBalance: true, checkinStreak: true, lastCheckinAt: true, emailVerifiedAt: true,
        isPro: true, proExpiresAt: true, aiBonusQuestions: true, name: true,
      },
    }),
    db.peerzLedger.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
    db.peerzLedger.aggregate({ where: { userId, amount: { gt: 0 }, season: season.id }, _sum: { amount: true } }),
    db.peerzLedger.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 40 }),
  ])
  if (!me) redirect("/login")

  const today = new Date().toISOString().slice(0, 10)
  const checkedToday = me.lastCheckinAt?.toISOString().slice(0, 10) === today

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Balance */}
      <section className="rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10" style={card}>
        <div className="relative flex items-center justify-center w-36 h-36 flex-none">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 65%)" }}
            aria-hidden="true"
          />
          <PeerzCoin size={96} orbit float />
        </div>
        <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
          <span className="font-mono text-xs tracking-[0.18em]" style={{ color: ink("#fbbf24") }}>PEERZ</span>
          <span className="font-mono font-bold text-5xl tabular-nums tracking-tight" style={{ color: "var(--text-primary)" }}>
            {formatPeerz(me.peerzBalance)}
          </span>
          <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            Lifetime {formatPeerz(lifetime._sum.amount ?? 0)} · Season {season.id.slice(1)} ({season.name}){" "}
            {formatPeerz(thisSeason._sum.amount ?? 0)}
          </span>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Proof of your edge. Earn Peerz when your calls hit; spend them below.
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6 min-w-0">
          {/* Genesis */}
          {genesisNo != null && (
            <section
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.35)" }}
            >
              <div
                className="w-12 h-12 rounded-full p-[3px] flex-none"
                style={{ background: "conic-gradient(#fbbf24, #f472b6, #22c3ee, #2ee6a8, #fbbf24)" }}
                aria-hidden="true"
              >
                <div className="w-full h-full rounded-full flex items-center justify-center font-mono text-xs font-bold"
                  style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
                  G
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-bold" style={{ color: ink("#fde68a") }}>
                  Genesis #{String(genesisNo).padStart(4, "0")}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  One of the first {formatPeerz(GENESIS_LIMIT)} on Peerza · ×{GENESIS_MULT} Peerz on call hits through Season 1
                </p>
              </div>
            </section>
          )}

          {/* Check-in streak */}
          <section className="rounded-2xl p-4 space-y-3" style={card}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Daily check-in</h2>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {checkedToday ? "Collected today" : "Open Peerza each day"}
              </span>
            </div>
            <ol className="grid grid-cols-7 gap-1.5">
              {CHECKIN_REWARDS.map((r, i) => {
                const done = checkedToday ? i < me.checkinStreak : false
                const isToday = checkedToday && i === me.checkinStreak - 1
                return (
                  <li
                    key={i}
                    className="rounded-xl py-2 flex flex-col items-center gap-1"
                    style={{
                      background: done ? "rgba(251,191,36,0.12)" : "var(--bg-base)",
                      border: `1px solid ${isToday ? "#fbbf24" : done ? "rgba(251,191,36,0.35)" : "var(--border)"}`,
                    }}
                  >
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>D{i + 1}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: done ? ink("#fcd34d") : "var(--text-primary)" }}>
                      {r}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>

          {/* Store */}
          <PeerzStore
            items={STORE_ITEMS}
            balance={me.peerzBalance}
            verified={!!me.emailVerifiedAt}
            proUntil={me.isPro && me.proExpiresAt ? me.proExpiresAt.toISOString() : null}
            bonusQuestions={me.aiBonusQuestions}
          />

          {/* How to earn */}
          <section className="rounded-2xl p-4 space-y-3" style={card}>
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>How to earn</h2>
            <ul className="text-sm divide-y" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
              {[
                ["Ranked call hits", `${hitBasePeerz(0.3)}–${formatPeerz(hitBasePeerz(3))}, harder targets pay more`],
                ["Any call that resolves", `+${RESOLVED_PEERZ}, up to ${RESOLVED_DAILY_CAP} a day`],
                ["Hot Hand", `×${HOT_HAND_MULT} from your ${HOT_HAND_MIN_STREAK}rd hit in a row`],
                ["Rank", `Analyst ×${TIER_MULT.analyst} · Sharp ×${TIER_MULT.sharp} · Elite ×${TIER_MULT.elite} · Legend ×${TIER_MULT.legend}`],
                ["Duel wins", `+${DUEL_WIN_PEERZ}`],
                ["Daily check-in", `${CHECKIN_REWARDS[0]} → ${CHECKIN_REWARDS[6]} on day 7`],
              ].map(([k, v]) => (
                <li key={k} className="flex justify-between gap-4 py-2" style={{ borderColor: "var(--border)" }}>
                  <span style={{ color: "var(--text-primary)" }}>{k}</span>
                  <span className="text-right font-mono text-xs">{v}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              A miss never costs Peerz. It only moves your{" "}
              <Link href={`/profile/${session.user.username}`} className="underline">Peerza Score</Link>.
            </p>
          </section>
        </div>

        {/* Activity */}
        <section className="rounded-2xl p-4 space-y-1 min-w-0 self-start" style={card}>
          <h2 className="font-bold text-sm pb-2" style={{ color: "var(--text-primary)" }}>Activity</h2>
          {ledger.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-secondary)" }}>
              Nothing yet. Make a Ranked Call from the composer — Peerz land when it resolves.
            </p>
          ) : (
            <ul>
              {ledger.map((row) => {
                const detail = detailOf(row.reason, row.meta)
                return (
                  <li key={row.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {LEDGER_LABELS[row.reason] ?? row.reason}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {when(row.createdAt)}{detail && ` · ${detail}`}
                      </p>
                    </div>
                    <span
                      className="font-mono font-bold text-sm tabular-nums"
                      style={{ color: row.amount > 0 ? ink("#fcd34d") : "var(--text-secondary)" }}
                    >
                      {row.amount > 0 ? "+" : "−"}{formatPeerz(Math.abs(row.amount))}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="text-center font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
        Peerz are earned only by using Peerza. They can&apos;t be bought, sold or transferred and have no cash value.{" "}
        <Link href="/legal/terms#peerz" className="underline">Terms</Link>
      </p>
    </div>
  )
}
