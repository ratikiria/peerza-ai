"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { PhoneOff, Mic, MicOff, User, Video, VideoOff, Monitor, MonitorOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { playOutgoingRing, type RingController } from "@/lib/call-sounds"

interface Participant {
  id: string
  name: string
  username: string
  image?: string | null
}

interface ActiveCallViewProps {
  callId: string
  isInitiator: boolean
  partner: Participant
  currentUserId: string
  kind?: "AUDIO" | "VIDEO"
}

// Public STUN + free TURN relays. STUN is enough on permissive networks; TURN
// kicks in when both peers are behind symmetric NATs (most home Wi-Fi setups,
// which is why the call connected but no video traffic flowed before).
// OpenRelay's free tier is rate-limited but reliable enough for testing/demos.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
]

export default function ActiveCallView({ callId, isInitiator, partner, kind = "AUDIO" }: ActiveCallViewProps) {
  const router = useRouter()
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const audioSenderRef = useRef<RTCRtpSender | null>(null)
  const videoSenderRef = useRef<RTCRtpSender | null>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null) // saved when screen-sharing so we can restore
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)

  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [videoOn, setVideoOn] = useState(kind === "VIDEO")
  const [screenSharing, setScreenSharing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [status, setStatus] = useState<"connecting" | "active" | "ended">("connecting")
  const [remoteHasVideo, setRemoteHasVideo] = useState(false)
  const endedRef = useRef(false)
  const ringRef = useRef<RingController | null>(null)

  // Outgoing ring while caller waits for the ICE to connect
  useEffect(() => {
    if (isInitiator && status === "connecting") {
      ringRef.current = playOutgoingRing()
    }
    return () => {
      ringRef.current?.stop()
      ringRef.current = null
    }
  }, [isInitiator, status])

  const endCall = useCallback(async (callStatus = "ENDED") => {
    if (endedRef.current) return
    endedRef.current = true

    setStatus("ended")
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    cameraTrackRef.current?.stop()
    pcRef.current?.close()

    await fetch(`/api/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: callStatus }),
    })
    await fetch(`/api/calls/signal/${callId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    })

    router.push("/messages")
  }, [callId, router])

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval>
    let durationInterval: ReturnType<typeof setInterval>

    async function setup() {
      // Always request audio. Video is requested only if the call started as VIDEO;
      // in audio mode the user can later flip on the camera and we'll request it then.
      const initialConstraints: MediaStreamConstraints = {
        audio: true,
        video: kind === "VIDEO" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(initialConstraints)
      localStreamRef.current = stream

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      // Pre-allocate sendrecv transceivers for both audio and video. For an audio
      // call we attach the audio track but leave video sender empty — the partner
      // already negotiated a video slot, so a later replaceTrack(videoTrack) will
      // start frames flowing without a renegotiation round.
      const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" })
      const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" })
      audioSenderRef.current = audioTransceiver.sender
      videoSenderRef.current = videoTransceiver.sender

      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) await audioSenderRef.current.replaceTrack(audioTrack)

      const initialVideoTrack = stream.getVideoTracks()[0]
      if (initialVideoTrack) {
        await videoSenderRef.current.replaceTrack(initialVideoTrack)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      }

      // Aggregate remote tracks into a single MediaStream that drives both audio
      // and video elements. This handles the case where audio + video tracks
      // arrive in separate ontrack events.
      const remoteStream = new MediaStream()
      remoteStreamRef.current = remoteStream
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream

      pc.ontrack = (e) => {
        const track = e.track
        // Avoid duplicate adds when the same track fires twice
        if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
          remoteStream.addTrack(track)
        }
        if (track.kind === "video") {
          setRemoteHasVideo(track.enabled && track.readyState === "live")
          track.onmute = () => setRemoteHasVideo(false)
          track.onunmute = () => setRemoteHasVideo(true)
          track.onended = () => setRemoteHasVideo(false)
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnected(true)
          setStatus("active")
          if (!durationInterval) {
            durationInterval = setInterval(() => setDuration((d) => d + 1), 1000)
          }
          fetch(`/api/calls/${callId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACTIVE" }),
          })
        }
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          endCall()
        }
      }

      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await fetch(`/api/calls/signal/${callId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidate: JSON.stringify(e.candidate) }),
          })
        }
      }

      if (isInitiator) {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await fetch(`/api/calls/signal/${callId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offer: JSON.stringify(offer) }),
        })

        let receivedCandidateCount = 0
        pollInterval = setInterval(async () => {
          const res = await fetch(`/api/calls/signal/${callId}`)
          if (!res.ok) return
          const data = await res.json()

          if (data.answer && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(JSON.parse(data.answer))
          }

          const candidates: string[] = data.receiverCandidates ?? []
          for (let i = receivedCandidateCount; i < candidates.length; i++) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidates[i])))
            } catch {}
          }
          receivedCandidateCount = candidates.length
        }, 800)
      } else {
        let answered = false
        let receivedCandidateCount = 0

        pollInterval = setInterval(async () => {
          const res = await fetch(`/api/calls/signal/${callId}`)
          if (!res.ok) return
          const data = await res.json()

          if (data.offer && !answered) {
            answered = true
            await pc.setRemoteDescription(JSON.parse(data.offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            await fetch(`/api/calls/signal/${callId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ answer: JSON.stringify(answer) }),
            })
          }

          const candidates: string[] = data.initiatorCandidates ?? []
          for (let i = receivedCandidateCount; i < candidates.length; i++) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidates[i])))
            } catch {}
          }
          receivedCandidateCount = candidates.length
        }, 800)
      }
    }

    setup().catch((err) => {
      console.error("[ActiveCallView] setup failed:", err)
      endCall("ENDED")
    })

    return () => {
      clearInterval(pollInterval)
      clearInterval(durationInterval)
    }
  }, [callId, isInitiator, endCall, kind])

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
    setMuted((m) => !m)
  }

  // Toggle camera on/off — works in both audio-call mode (turns camera on for the
  // first time) and video-call mode (just disables the existing track).
  async function toggleCamera() {
    const sender = videoSenderRef.current
    if (!sender) return

    if (videoOn) {
      // Turn camera off — replace the sender's track with null and stop the
      // camera hardware. Keep the transceiver so partner can re-receive video
      // when we toggle back on.
      const track = sender.track
      try { await sender.replaceTrack(null) } catch {}
      track?.stop()
      // Also remove from local stream so the preview goes black
      if (localStreamRef.current && track) {
        localStreamRef.current.removeTrack(track)
      }
      cameraTrackRef.current?.stop()
      cameraTrackRef.current = null
      if (localVideoRef.current) localVideoRef.current.srcObject = null
      setVideoOn(false)
      return
    }

    // Turn camera on — request the camera (may prompt on first use), attach to
    // the existing video transceiver via replaceTrack (no SDP renegotiation).
    try {
      const cam = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      const videoTrack = cam.getVideoTracks()[0]
      if (!videoTrack) return
      await sender.replaceTrack(videoTrack)
      cameraTrackRef.current = videoTrack

      // Add to local stream for the preview
      if (localStreamRef.current) {
        const existingVideo = localStreamRef.current.getVideoTracks()
        existingVideo.forEach((t) => {
          t.stop()
          localStreamRef.current?.removeTrack(t)
        })
        localStreamRef.current.addTrack(videoTrack)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
        }
      }
      setVideoOn(true)
      setScreenSharing(false)
    } catch (err) {
      console.warn("[ActiveCallView] camera permission denied:", err)
    }
  }

  // Swap the video sender's track between camera ↔ screen. The camera track is
  // remembered so we can restore it cleanly when sharing stops.
  async function toggleScreenShare() {
    const sender = videoSenderRef.current
    if (!sender) return

    if (screenSharing) {
      // Stop sharing — restore camera track if we have one, otherwise null
      const camTrack = cameraTrackRef.current
      try { await sender.replaceTrack(camTrack ?? null) } catch {}
      // Stop the screen track that was being sent (held in localVideoRef preview)
      const previewSrc = localVideoRef.current?.srcObject as MediaStream | null
      previewSrc?.getVideoTracks().forEach((t) => {
        if (t !== camTrack) t.stop()
      })
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      setScreenSharing(false)
      setVideoOn(!!camTrack)
      return
    }

    try {
      const display = await (navigator.mediaDevices as MediaDevices & {
        getDisplayMedia: (c: MediaStreamConstraints) => Promise<MediaStream>
      }).getDisplayMedia({ video: true, audio: false })
      const screenTrack = display.getVideoTracks()[0]
      if (!screenTrack) return

      // Remember camera track so we can restore it. If videoOn is true, the
      // current sender.track is the camera; save it.
      if (videoOn && sender.track && sender.track !== screenTrack) {
        cameraTrackRef.current = sender.track
      }

      await sender.replaceTrack(screenTrack)

      // Show screen feed in local self-preview while sharing
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = display
      }

      // Auto-stop on user clicking browser's "Stop sharing"
      screenTrack.onended = () => {
        toggleScreenShare()
      }

      setScreenSharing(true)
      setVideoOn(true)
    } catch (err) {
      console.warn("[ActiveCallView] screen share denied/failed:", err)
    }
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, "0")}`
  }

  const showRemoteVideo = videoOn && remoteHasVideo

  return (
    <div className="fixed inset-0 z-50 bg-gray-950">
      <audio ref={remoteAudioRef} autoPlay />

      {/* Remote video — always mounted; visible only when there's an actual remote video track */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover bg-black"
        style={{ display: showRemoteVideo ? "block" : "none" }}
      />

      {/* Audio-only / no-remote-video placeholder — large avatar centered */}
      {!showRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div className="w-28 h-28 rounded-full bg-emerald-500/20 flex items-center justify-center overflow-hidden">
            {partner.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.image} alt={partner.name} className="w-full h-full object-cover" />
            ) : (
              <User size={44} className="text-emerald-400" />
            )}
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-100">{partner.name}</p>
            <p className="text-sm text-gray-400 mt-1">
              {status === "connecting" && (
                <span className="animate-pulse">{isInitiator ? "Calling…" : "Connecting…"}</span>
              )}
              {status === "active" && formatDuration(duration)}
              {status === "ended" && "Call ended"}
            </p>
          </div>
          {connected && !showRemoteVideo && (
            <div className="flex items-end gap-1 h-6 mt-1">
              {[18, 14, 22, 16, 20].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full animate-pulse"
                  style={{ height: `${h}px`, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Local self-preview — mirrored when showing camera, NOT mirrored when showing screen share */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-4 right-4 w-40 h-28 rounded-xl object-cover shadow-2xl border-2"
        style={{
          borderColor: "rgba(16,185,129,0.6)",
          display: videoOn || screenSharing ? "block" : "none",
          transform: screenSharing ? "none" : "scaleX(-1)",
        }}
      />

      {/* Header bar */}
      <div
        className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs flex items-center gap-2"
        style={{ background: "rgba(0,0,0,0.5)", color: "#f0f2f5", backdropFilter: "blur(8px)" }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold">{partner.name}</span>
        <span className="opacity-60">·</span>
        <span className="tabular-nums">
          {status === "active" ? formatDuration(duration) : status === "ended" ? "Ended" : "—"}
        </span>
        {screenSharing && (
          <>
            <span className="opacity-60">·</span>
            <span className="text-emerald-400 inline-flex items-center gap-1">
              <Monitor size={11} /> Sharing screen
            </span>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-4">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            muted ? "bg-rose-500/30 text-rose-300" : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={toggleCamera}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            videoOn && !screenSharing
              ? "bg-emerald-500/30 text-emerald-200"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={videoOn ? "Turn camera off" : "Turn camera on"}
        >
          {videoOn && !screenSharing ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            screenSharing
              ? "bg-emerald-500/30 text-emerald-200"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={screenSharing ? "Stop sharing screen" : "Share screen"}
        >
          {screenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
        </button>

        <button
          onClick={() => endCall("ENDED")}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-500 hover:bg-rose-400 flex items-center justify-center transition-colors"
          title="End call"
        >
          <PhoneOff size={24} className="text-white" />
        </button>
      </div>
    </div>
  )
}
