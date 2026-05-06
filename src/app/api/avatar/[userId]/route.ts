import { db } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { image: true },
  })

  if (!user?.image) {
    // Return a default SVG placeholder so <img> tags never break
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="#1a2332"/>
      <circle cx="50" cy="38" r="18" fill="#10b981"/>
      <ellipse cx="50" cy="82" rx="28" ry="20" fill="#10b981"/>
    </svg>`
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    })
  }

  // base64 data URL → serve raw bytes
  if (user.image.startsWith("data:")) {
    const [header, data] = user.image.split(",")
    const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg"
    const buffer   = Buffer.from(data, "base64")
    return new Response(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "no-store",
      },
    })
  }

  // external URL → redirect
  return Response.redirect(user.image)
}
