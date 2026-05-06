import { NextRequest, NextResponse } from "next/server"

function flagFromCountry(code: string): string {
  if (!code || code.length !== 2) return ""
  const upper = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return ""
  return String.fromCodePoint(
    ...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

function isLocal(ip: string): boolean {
  if (!ip) return true
  if (ip === "127.0.0.1" || ip === "::1") return true
  if (ip.startsWith("192.168.")) return true
  if (ip.startsWith("10.")) return true
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1] || "0", 10)
    if (second >= 16 && second <= 31) return true
  }
  return false
}

export async function GET(req: NextRequest) {
  // Edge / proxy hints first
  const cf = req.headers.get("cf-ipcountry")
  const vc = req.headers.get("x-vercel-ip-country")
  const headerCountry = (vc || cf || "").toUpperCase()
  if (headerCountry && headerCountry !== "XX" && /^[A-Z]{2}$/.test(headerCountry)) {
    return NextResponse.json({
      countryCode: headerCountry,
      country: req.headers.get("x-vercel-ip-country-name") || "",
      flag: flagFromCountry(headerCountry),
      source: "header",
    })
  }

  // Resolve client IP from common forwarded headers
  const xff = req.headers.get("x-forwarded-for") || ""
  const realIp = req.headers.get("x-real-ip") || ""
  const candidate = xff.split(",")[0].trim() || realIp
  const ip = isLocal(candidate) ? "" : candidate

  const services: Array<{ url: string; parse: (j: Record<string, unknown>) => { code: string; country: string } | null }> = [
    {
      url: ip ? `https://api.country.is/${encodeURIComponent(ip)}` : `https://api.country.is/`,
      parse: (j) => {
        const code = j.country as string | undefined
        if (!code) return null
        return { code: code.toUpperCase(), country: "" }
      },
    },
    {
      url: ip ? `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode` : `http://ip-api.com/json/?fields=status,country,countryCode`,
      parse: (j) => {
        if (j.status !== "success") return null
        const code = j.countryCode as string | undefined
        if (!code) return null
        return { code: code.toUpperCase(), country: (j.country as string) || "" }
      },
    },
    {
      url: ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : `https://ipwho.is/`,
      parse: (j) => {
        if (j.success === false) return null
        const code = j.country_code as string | undefined
        if (!code) return null
        return { code: code.toUpperCase(), country: (j.country as string) || "" }
      },
    },
  ]

  const headers = {
    "User-Agent": "Mozilla/5.0 peerio-ai/1.0",
    Accept: "application/json",
  }

  for (const s of services) {
    try {
      const res = await fetch(s.url, { cache: "no-store", headers })
      if (!res.ok) {
        console.warn("[geo] non-ok from", s.url, res.status)
        continue
      }
      const data = (await res.json()) as Record<string, unknown>
      const parsed = s.parse(data)
      if (parsed?.code && /^[A-Z]{2}$/.test(parsed.code)) {
        return NextResponse.json({
          countryCode: parsed.code,
          country: parsed.country,
          flag: flagFromCountry(parsed.code),
          source: ip ? "ip" : "outbound",
        })
      }
    } catch (e) {
      console.warn("[geo] lookup failed for", s.url, e)
    }
  }

  return NextResponse.json({ countryCode: "", country: "", flag: "", source: "none" })
}
