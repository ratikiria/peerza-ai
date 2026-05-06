"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, User } from "lucide-react"
import AvatarUploadModal from "@/components/shared/AvatarUploadModal"
import StoryUploadModal from "./StoryUploadModal"
import StoryViewerModal, { type ViewerStory } from "./StoryViewerModal"

// Group of stories from a single author returned by GET /api/stories.
interface AuthorGroup {
  author: {
    id: string
    name: string
    username: string
    image?: string | null
    isPremium: boolean
    isPro?: boolean
  }
  stories: Array<{
    id: string
    mediaUrl: string
    caption?: string | null
    expiresAt: string
    createdAt: string
    viewed: boolean
    viewCount: number
    myReaction: string | null
  }>
  hasUnviewed: boolean
  latestCreatedAt: string
}

interface OwnStory {
  id: string
  mediaUrl: string
  caption?: string | null
  expiresAt: string
  createdAt: string
  viewCount: number
  reactionCount: number
  replyCount: number
  views: ViewerStory["views"]
  reactions: ViewerStory["reactions"]
  replies: ViewerStory["replies"]
}

interface StoriesBarProps {
  currentUser: {
    id: string
    name: string
    username: string
    image?: string | null
  }
}

export default function StoriesBar({ currentUser }: StoriesBarProps) {
  const [groups, setGroups]               = useState<AuthorGroup[]>([])
  const [ownStories, setOwnStories]       = useState<OwnStory[]>([])
  const [avatarUrl, setAvatarUrl]         = useState(currentUser.image)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [viewerMode, setViewerMode]       = useState<"own" | "other" | null>(null)
  const [viewerStories, setViewerStories] = useState<ViewerStory[]>([])
  const [viewerAuthor, setViewerAuthor]   = useState<AuthorGroup["author"] | null>(null)

  const loadStories = useCallback(async () => {
    const [groupsRes, mineRes] = await Promise.all([
      fetch("/api/stories").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/stories/mine").then((r) => r.ok ? r.json() : []).catch(() => []),
    ])
    setGroups(groupsRes)
    setOwnStories(mineRes)
  }, [])

  useEffect(() => { loadStories() }, [loadStories])

  function handleYourStoryClick() {
    if (ownStories.length > 0) {
      setViewerMode("own")
      setViewerStories(ownStories.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        caption: s.caption ?? null,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        viewCount: s.viewCount,
        reactionCount: s.reactionCount,
        replyCount: s.replyCount,
        views: s.views,
        reactions: s.reactions,
        replies: s.replies,
      })))
      setViewerAuthor(null)
    } else {
      setShowUploadModal(true)
    }
  }

  function handleAddStory() {
    setShowUploadModal(true)
  }

  function handleAuthorClick(group: AuthorGroup) {
    setViewerMode("other")
    setViewerStories(group.stories.map((s) => ({
      id: s.id,
      mediaUrl: s.mediaUrl,
      caption: s.caption ?? null,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      viewed: s.viewed,
      myReaction: s.myReaction,
    })))
    setViewerAuthor(group.author)
  }

  // Most recent story is the bubble preview for "Your story"
  const ownPreview = ownStories.length > 0 ? ownStories[ownStories.length - 1] : null

  return (
    <>
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>

          {/* ── Your story bubble ── */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="relative">
              {/* Avatar ring — green if has any active stories, dashed if not */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                style={{
                  padding: "2px",
                  background: ownPreview
                    ? "linear-gradient(135deg, #10b981, #3b82f6)"
                    : "var(--border)",
                }}
                onClick={handleYourStoryClick}
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: "var(--bg-base)" }}
                >
                  {ownPreview ? (
                    <img src={ownPreview.mediaUrl} alt="Your story" className="w-full h-full object-cover rounded-full" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt={currentUser.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <User size={20} className="text-emerald-400" />
                  )}
                </div>
              </div>

              {/* + badge — always opens upload modal so a new story is appended,
                  not the avatar-edit modal. Stops propagation so the parent's
                  click handler (which opens the viewer when stories exist) doesn't fire. */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                style={{ background: "#10b981", border: "2px solid var(--bg-card)" }}
                onClick={(e) => { e.stopPropagation(); handleAddStory() }}
                title="Add to your story"
              >
                <Plus size={10} className="text-white" strokeWidth={3} />
              </div>
            </div>
            <span
              className="text-[10px] font-medium truncate w-14 text-center cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={handleYourStoryClick}
            >
              {ownStories.length > 0
                ? (ownStories.length === 1 ? "Your story" : `${ownStories.length} stories`)
                : "Add story"}
            </span>
          </div>

          {/* ── Other users' story bubbles (one per author) ── */}
          {groups.map((group) => {
            // Use the most recent story's media as the bubble preview
            const preview = group.stories[group.stories.length - 1]
            return (
              <div
                key={group.author.id}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                onClick={() => handleAuthorClick(group)}
              >
                <div
                  className="w-14 h-14 rounded-full"
                  style={{
                    padding: "2px",
                    background: !group.hasUnviewed
                      ? "var(--border)"
                      : "linear-gradient(135deg, #10b981 0%, #6366f1 100%)",
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                    style={{ background: "var(--bg-base)" }}
                  >
                    <img
                      src={preview.mediaUrl}
                      alt={`${group.author.name}'s story`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
                <span className="text-[10px] font-medium truncate w-14 text-center" style={{ color: "var(--text-secondary)" }}>
                  {group.author.name.split(" ")[0]}
                  {group.stories.length > 1 && (
                    <span style={{ color: "#10b981" }}> · {group.stories.length}</span>
                  )}
                </span>
              </div>
            )
          })}

          {groups.length === 0 && ownStories.length === 0 && (
            <div className="flex items-center px-2">
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Follow people to see their stories
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showAvatarModal && (
        <AvatarUploadModal
          currentImage={avatarUrl}
          onClose={() => setShowAvatarModal(false)}
          onUpdated={(url) => setAvatarUrl(url)}
        />
      )}

      {showUploadModal && (
        <StoryUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => { loadStories() }}
        />
      )}

      {viewerMode && viewerStories.length > 0 && (
        <StoryViewerModal
          mode={viewerMode}
          stories={viewerStories}
          author={viewerAuthor ?? undefined}
          onClose={() => {
            setViewerMode(null)
            setViewerStories([])
            setViewerAuthor(null)
            loadStories()
          }}
        />
      )}
    </>
  )
}
