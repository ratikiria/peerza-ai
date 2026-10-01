"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { PORTFOLIO_EMOJIS, PORTFOLIO_THEMES, themeFor, type PortfolioThemeKey } from "@/lib/portfolio-themes"

export interface PortfolioDraft { name: string; emoji: string; color: string }

// Create / edit a portfolio: name, emoji and theme, with a live preview.
export default function PortfolioDialog({
  open, initial, onClose, onSave, onDelete, canDelete,
}: {
  open: boolean
  initial: PortfolioDraft | null       // null = create
  onClose: () => void
  onSave: (d: PortfolioDraft) => Promise<string | null>   // returns an error message or null
  onDelete?: () => void
  canDelete?: boolean
}) {
  const t = useTranslations("Portfolio")
  const [d, setD] = useState<PortfolioDraft>({ name: "", emoji: "🚀", color: "violet" })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Reset the draft only when the dialog opens (initial is a fresh object
  // on every parent render, so it can't be a dependency).
  useEffect(() => {
    if (!open) return
    setD(initial ?? { name: "", emoji: "🚀", color: "violet" })
    setErr(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null
  const th = themeFor(d.color)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!d.name.trim()) { setErr(t("dlg_name_required")); return }
    setSaving(true)
    const error = await onSave({ ...d, name: d.name.trim() })
    setSaving(false)
    if (error) setErr(error)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label={initial ? t("edit_portfolio") : t("new_portfolio")}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", boxShadow: `0 30px 80px -20px ${th.from}55` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{initial ? t("edit_portfolio") : t("new_portfolio")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--glass)]" style={{ color: "var(--text-secondary)" }}>
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Live preview */}
          <div className="rounded-2xl p-px" style={{ background: `linear-gradient(140deg, ${th.from}, transparent 45%, transparent 60%, ${th.to})` }}>
            <div className="relative rounded-[15px] p-4 flex items-center gap-3 overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <span aria-hidden="true" className="absolute -top-12 -right-8 w-36 h-36 rounded-full"
                style={{ background: `radial-gradient(circle, ${th.from}40 0%, transparent 70%)` }} />
              <span className="relative w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `linear-gradient(135deg, ${th.from}33, ${th.to}22)`, border: `1px solid ${th.from}55` }}>
                {d.emoji}
              </span>
              <div className="relative min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{d.name.trim() || t("dlg_name_placeholder")}</p>
                <p className="text-[11px] font-mono" style={{ backgroundImage: `linear-gradient(90deg, ${th.from}, ${th.to})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  $0.00 · {t("dlg_preview")}
                </p>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="block text-[10.5px] font-semibold uppercase tracking-[.08em] mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("dlg_name")}</span>
            <input autoFocus value={d.name} maxLength={40}
              onChange={(e) => setD({ ...d, name: e.target.value })}
              placeholder={t("dlg_name_placeholder")}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </label>

          <div>
            <span className="block text-[10.5px] font-semibold uppercase tracking-[.08em] mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("dlg_icon")}</span>
            <div className="grid grid-cols-6 gap-1.5">
              {PORTFOLIO_EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setD({ ...d, emoji: e })} aria-pressed={d.emoji === e}
                  className="h-10 rounded-xl text-lg transition-all"
                  style={d.emoji === e
                    ? { background: `${th.from}22`, border: `1px solid ${th.from}88` }
                    : { background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[10.5px] font-semibold uppercase tracking-[.08em] mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("dlg_theme")}</span>
            <div className="flex gap-2">
              {(Object.keys(PORTFOLIO_THEMES) as PortfolioThemeKey[]).map((k) => {
                const tk = PORTFOLIO_THEMES[k]
                return (
                  <button key={k} type="button" onClick={() => setD({ ...d, color: k })} aria-pressed={d.color === k} title={tk.name} aria-label={tk.name}
                    className="w-9 h-9 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${tk.from}, ${tk.to})`,
                      boxShadow: d.color === k ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${tk.from}` : "none",
                    }} />
                )
              })}
            </div>
          </div>

          {err && <p className="text-xs" style={{ color: "var(--down)" }}>{err}</p>}
        </div>

        <div className="flex items-center gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
          {initial && onDelete && (
            <button type="button" onClick={onDelete} disabled={!canDelete}
              title={canDelete ? t("delete_portfolio") : t("delete_last_hint")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: "var(--down)", border: "1px solid rgba(255,92,122,0.3)" }}>
              <Trash2 size={13} /> {t("delete_portfolio")}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-xl"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
            {t("cancel")}
          </button>
          <button type="submit" disabled={saving} className="text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${th.from}, ${th.to})`, color: "#04110c", boxShadow: `0 4px 18px ${th.from}55` }}>
            {saving ? t("saving") : initial ? t("save") : t("create")}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
