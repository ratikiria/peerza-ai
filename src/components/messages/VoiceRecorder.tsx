"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, Square, Send, X } from "lucide-react"
import WaveformPlayer from "./WaveformPlayer"

interface VoiceRecorderProps {
  onSend: (voiceUrl: string) => void
  onCancel: () => void
}

const LIVE_BARS = 40

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [liveBars, setLiveBars] = useState<number[]>(() => Array(LIVE_BARS).fill(0.1))

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const barsRef = useRef<number[]>(Array(LIVE_BARS).fill(0.1))

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
    }
  }, [])

  function startVisualizer(stream: MediaStream) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)

    audioCtxRef.current = ctx
    analyserRef.current = analyser
    sourceRef.current = source

    const buf = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)
      const level = Math.min(1, rms * 3)
      barsRef.current = [...barsRef.current.slice(1), Math.max(0.08, level)]
      setLiveBars(barsRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  function stopVisualizer() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try {
      sourceRef.current?.disconnect()
      analyserRef.current?.disconnect()
    } catch {}
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
    sourceRef.current = null
  }

  function pickMimeType(): string | undefined {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ]
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c
    }
    return undefined
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      barsRef.current = Array(LIVE_BARS).fill(0.1)
      setLiveBars(barsRef.current)

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        stopVisualizer()
        const blobType = mr.mimeType || mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type: blobType })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
      }

      mr.start(250)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      startVisualizer(stream)
    } catch (err) {
      console.error("[VoiceRecorder] startRecording failed:", err)
      alert("Microphone permission denied")
    }
  }

  function stopRecording() {
    if (mediaRef.current && recording) {
      mediaRef.current.stop()
      setRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  async function handleSend() {
    if (!audioBlob) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      onSend(base64)
    }
    reader.readAsDataURL(audioBlob)
  }

  function handleCancel() {
    if (recording) stopRecording()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    onCancel()
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
      {!audioUrl ? (
        <>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>

          {recording ? (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <div className="flex items-center gap-[2px] flex-1 h-8">
                {liveBars.map((p, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-emerald-400 transition-[height] duration-75"
                    style={{ height: `${Math.max(10, p * 100)}%` }}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-300 font-mono tabular-nums shrink-0">{formatTime(seconds)}</span>
              <button
                onClick={stopRecording}
                className="text-rose-400 hover:text-rose-300 transition-colors"
              >
                <Square size={18} />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-gray-500">Tap mic to record</span>
              <button
                onClick={startRecording}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Mic size={18} />
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <button onClick={handleCancel} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
          <WaveformPlayer src={audioUrl} variant="preview" className="flex-1" />
          <button
            onClick={handleSend}
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Send size={18} />
          </button>
        </>
      )}
    </div>
  )
}
