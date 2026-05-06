import { getTranslations } from "next-intl/server"
import Logo, { LogoMark } from "@/components/brand/Logo"
import AuthShowcase from "@/components/auth/AuthShowcase"
import LiveTicker from "@/components/auth/LiveTicker"
import LocaleSwitcher from "@/components/settings/LocaleSwitcher"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Auth")
  return (
    <div
      className="h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 25% 20%, rgba(16,185,129,0.15) 0%, transparent 50%), radial-gradient(ellipse at 75% 80%, rgba(99,102,241,0.12) 0%, transparent 55%), linear-gradient(160deg, #0f2d1f 0%, #0f1117 50%, #0d1a2e 100%)",
      }}
    >
      {/* Floating blob lights — span the WHOLE viewport so the seam disappears */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-emerald-500/15 blur-3xl animate-[pz-blob_12s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full bg-amber-500/8 blur-3xl animate-[pz-blob3_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] rounded-full bg-indigo-500/12 blur-3xl animate-[pz-blob2_14s_ease-in-out_infinite]" />
        <div className="absolute top-1/4 right-1/3 w-72 h-72 rounded-full bg-rose-500/8 blur-3xl animate-[pz-blob_16s_ease-in-out_infinite]" />
      </div>

      {/* Subtle vertical glow at the seam (only visible at lg+) */}
      <div
        className="pointer-events-none hidden lg:block absolute top-0 bottom-0 w-px"
        style={{
          left: "560px",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(16,185,129,0.25) 30%, rgba(99,102,241,0.2) 70%, transparent 100%)",
          boxShadow: "0 0 30px rgba(16,185,129,0.15)",
        }}
      />

      {/* Floating locale switcher — top-right of the viewport so unauthenticated
          visitors can change language before signing in. */}
      <div className="absolute top-3 right-3 z-30">
        <LocaleSwitcher variant="compact" />
      </div>

      <div className="relative h-full flex flex-col">
        {/* Full-width live ticker across the top */}
        <LiveTicker />

        {/* Main row: showcase (left) + form (right). min-h-0 lets children scroll independently. */}
        <div className="flex-1 flex min-h-0">
          {/* Left — animated showcase (scrolls internally if content is taller than viewport) */}
          <div className="hidden lg:flex w-[560px] flex-shrink-0 relative overflow-y-auto">
            <AuthShowcase />
          </div>

          {/* Right — form panel (scrolls internally so the page itself stays fixed) */}
          <div className="flex-1 flex items-start lg:items-center justify-center px-6 py-8 relative overflow-y-auto">
            <div className="relative w-full max-w-md my-auto">
              {/* Mobile logo */}
              <div className="flex flex-col items-center mb-6 lg:hidden">
                <div className="flex items-center justify-center gap-2.5">
                  <LogoMark size={40} />
                  <Logo size="md" />
                </div>
                <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--text-secondary)" }}>
                  {t("tagline")}
                </p>
              </div>

              {/* Glassmorphic form card */}
              <div className="rounded-2xl bg-gray-950/40 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 p-7">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pz-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 50px) scale(1.1); }
        }
        @keyframes pz-blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 30px) scale(1.08); }
        }
        @keyframes pz-blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -50px) scale(0.92); }
        }
      `}</style>
    </div>
  )
}
