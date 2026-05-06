// Web Audio synthesized ring tones — no asset files needed. Returns a controller
// with .stop() that gracefully fades and closes the AudioContext. Browsers block
// AudioContext until first user gesture; both call paths begin AFTER the user
// either clicked "call" (caller) or saw the incoming popup (receiver — they
// already had to interact with the page to navigate to it).

export type RingController = { stop: () => void }

// ── Classic phone ringback (dual tone + tremolo) ────────────────────────────
// Plays 440 Hz and 480 Hz simultaneously, modulated at 20 Hz to simulate the
// vibration of an electromagnetic bell. Cadence: 2 seconds ON, 4 seconds OFF —
// the standard North American ringback pattern. Sounds like the ring you hear
// when you call a landline.
function playClassicRing(cadenceOn: number, cadenceOff: number, gain: number): RingController {
  if (typeof window === "undefined") return { stop: () => {} }
  const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext
  if (!Ctx) return { stop: () => {} }

  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let ctx: AudioContext | null = null
  try { ctx = new Ctx() } catch { return { stop: () => {} } }

  let currentNodes: { osc: OscillatorNode; gain: GainNode }[] = []

  function ringOnce() {
    if (stopped || !ctx) return
    const now = ctx.currentTime
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.0001, now)
    masterGain.gain.exponentialRampToValueAtTime(gain, now + 0.05)
    masterGain.gain.setValueAtTime(gain, now + cadenceOn - 0.06)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + cadenceOn)
    masterGain.connect(ctx.destination)

    // 20 Hz amplitude tremolo to simulate the bell's mechanical wobble
    const tremoloOsc = ctx.createOscillator()
    tremoloOsc.frequency.value = 20
    const tremoloGain = ctx.createGain()
    tremoloGain.gain.value = 0.35
    tremoloOsc.connect(tremoloGain)
    tremoloGain.connect(masterGain.gain) // modulate masterGain.gain

    // Two simultaneous tones (440 + 480 Hz dual-tone ringback)
    const tones = [440, 480]
    const localNodes: { osc: OscillatorNode; gain: GainNode }[] = []
    for (const f of tones) {
      const o = ctx.createOscillator()
      o.type = "sine"
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = 0.5
      o.connect(g).connect(masterGain)
      o.start(now)
      o.stop(now + cadenceOn + 0.05)
      localNodes.push({ osc: o, gain: g })
    }
    tremoloOsc.start(now)
    tremoloOsc.stop(now + cadenceOn + 0.05)

    currentNodes = localNodes
    timer = setTimeout(ringOnce, (cadenceOn + cadenceOff) * 1000)
  }

  ringOnce()

  return {
    stop() {
      if (stopped) return
      stopped = true
      if (timer) clearTimeout(timer)
      try {
        for (const n of currentNodes) {
          n.gain.gain.cancelScheduledValues(ctx!.currentTime)
          n.gain.gain.setValueAtTime(n.gain.gain.value, ctx!.currentTime)
          n.gain.gain.exponentialRampToValueAtTime(0.0001, ctx!.currentTime + 0.08)
        }
      } catch {}
      setTimeout(() => {
        try { ctx?.close() } catch {}
        ctx = null
        currentNodes = []
      }, 150)
    },
  }
}

// Outgoing — what the caller hears while waiting (slow cadence, quieter)
export function playOutgoingRing(): RingController {
  return playClassicRing(2.0, 4.0, 0.16)
}

// Incoming — what the receiver hears (faster cadence, louder, more urgent)
export function playIncomingRing(): RingController {
  return playClassicRing(1.5, 2.5, 0.22)
}
