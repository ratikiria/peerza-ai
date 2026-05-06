import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import NewAdForm from "@/components/brands/NewAdForm"

export default async function NewAdPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  const { slug } = await params

  const brand = await db.brand.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, country: true, ownerId: true, logoUrl: true },
  })
  if (!brand) notFound()
  if (brand.ownerId !== session!.user.id) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <NewAdForm brand={brand} />
    </div>
  )
}
