import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { ArrowLeft, User } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import PostLikeButton from "@/components/posts/PostLikeButton"
import CommentSection from "@/components/posts/CommentSection"
import ProBadge from "@/components/shared/ProBadge"

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  const { postId } = await params

  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true },
      },
      likes: { select: { userId: true } },
      _count: { select: { comments: true, likes: true } },
    },
  })

  if (!post) notFound()

  const comments = await db.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true },
      },
    },
  })

  const liked = post.likes.some((l) => l.userId === session!.user.id)

  const serializedComments = comments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Back to feed
      </Link>

      <article className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex gap-3">
          <Link href={`/profile/${post.author.username}`} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              {post.author.image ? (
                <img
                  src={post.author.image}
                  alt={post.author.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={18} className="text-emerald-400" />
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/profile/${post.author.username}`}
                className="font-semibold text-gray-100 hover:text-emerald-400 transition-colors text-sm"
              >
                {post.author.name}
              </Link>
              {post.author.isPro && <ProBadge size="sm" />}
              <span className="text-gray-600 text-xs">@{post.author.username}</span>
              <span className="text-gray-700 text-xs">·</span>
              <span className="text-gray-600 text-xs">{formatRelativeTime(post.createdAt)}</span>
            </div>

            <p className="mt-2 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>

            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt="Post image"
                className="mt-3 rounded-lg max-h-96 object-cover w-full"
              />
            )}

            <PostLikeButton
              postId={post.id}
              initialLiked={liked}
              initialCount={post._count.likes}
            />
          </div>
        </div>
      </article>

      <CommentSection
        postId={post.id}
        initialComments={serializedComments}
        currentUser={{
          id: session!.user.id,
          name: session!.user.name!,
          username: session!.user.username,
          image: session!.user.image,
        }}
      />
    </div>
  )
}
