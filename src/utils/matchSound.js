// Phase 29B: âm thanh trận đấu tạo bằng Web Audio (không có file âm thanh):
// còi trọng tài, tiếng sút / chuyền, tiếng khán giả nền (to dần khi bóng gần
// khung thành), "ồ" khi cứu thua / sút trượt, hò reo khi có bàn thắng.
// Tắt / bật chung với SOUND ON / OFF (utils/sound.js).
import { audioContext, isMuted } from './sound'

let noiseBuffer = null
let crowd = null // { source, filter, gain, base }

function noise(ctx) {
    if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer

    // Tiếng ồn hồng (gần với tiếng đám đông hơn tiếng ồn trắng), 2 giây, lặp.
    const length = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let b0 = 0
    let b1 = 0
    let b2 = 0

    for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1

        b0 = 0.99765 * b0 + white * 0.099046
        b1 = 0.963 * b1 + white * 0.2965164
        b2 = 0.57 * b2 + white * 1.0526913
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18
    }

    noiseBuffer = buffer
    return buffer
}

function burst(ctx, { start = 0, duration = 0.2, volume = 0.3, type = 'lowpass', from = 800, to = from, q = 0.8 }) {
    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    const t0 = ctx.currentTime + start

    source.buffer = noise(ctx)
    filter.type = type
    filter.Q.value = q
    filter.frequency.setValueAtTime(from, t0)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + duration)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(volume, t0 + Math.min(0.08, duration * 0.3))
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    source.connect(filter).connect(gain).connect(ctx.destination)
    source.start(t0, Math.random() * 1.5)
    source.stop(t0 + duration + 0.05)
}

function tone(ctx, { type = 'sine', from, to = from, start = 0, duration = 0.2, volume = 0.3, vibrato = 0 }) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t0 = ctx.currentTime + start

    osc.type = type
    osc.frequency.setValueAtTime(from, t0)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + duration)

    if (vibrato) {
        // Còi có bi: rung tần số nhanh (~35 Hz).
        const lfo = ctx.createOscillator()
        const depth = ctx.createGain()

        lfo.frequency.value = 34
        depth.gain.value = vibrato
        lfo.connect(depth).connect(osc.frequency)
        lfo.start(t0)
        lfo.stop(t0 + duration + 0.05)
    }

    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02)
    gain.gain.setValueAtTime(volume, t0 + Math.max(0.03, duration - 0.06))
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
}

// ---- Còi ----
// kind: 'short' (phạm lỗi, việt vị), 'kickoff', 'half' (2 tiếng), 'full' (3 tiếng, tiếng cuối dài).
export function whistle(kind = 'short') {
    const ctx = audioContext()
    if (!ctx) return

    const blasts = {
        short: [[0, 0.22]],
        kickoff: [[0, 0.45]],
        half: [[0, 0.35], [0.5, 0.6]],
        full: [[0, 0.35], [0.5, 0.35], [1.0, 0.9]],
    }[kind] || [[0, 0.25]]

    blasts.forEach(([start, duration]) => {
        tone(ctx, { type: 'square', from: 2950, to: 2850, start, duration, volume: 0.035, vibrato: 140 })
        tone(ctx, { type: 'sine', from: 2950, to: 2850, start, duration, volume: 0.05, vibrato: 140 })
    })
}

// ---- Chạm bóng ----
// power 0..1: chuyền nhẹ → sút mạnh.
export function kick(power = 0.5) {
    const ctx = audioContext()
    if (!ctx) return

    const p = Math.max(0, Math.min(1, power))

    tone(ctx, { from: 150 + p * 60, to: 55, duration: 0.09 + p * 0.05, volume: 0.12 + p * 0.22 })
    burst(ctx, { duration: 0.05 + p * 0.04, volume: 0.05 + p * 0.12, from: 2400, to: 700 })
}

// ---- Khán giả ----
export function crowdStart() {
    const ctx = audioContext()
    if (!ctx || crowd) return

    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()

    source.buffer = noise(ctx)
    source.loop = true
    filter.type = 'bandpass'
    filter.frequency.value = 520
    filter.Q.value = 0.55
    gain.gain.value = 0.0001
    source.connect(filter).connect(gain).connect(ctx.destination)
    source.start()
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 1.5)
    crowd = { source, filter, gain, ctx, level: 0.3 }
}

export function crowdStop() {
    if (!crowd) return

    const { source, gain, ctx } = crowd

    try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
        source.stop(ctx.currentTime + 0.7)
    } catch {
        // đã dừng
    }

    crowd = null
}

// level 0..1: bóng ở giữa sân → gần khung thành.
export function crowdIntensity(level) {
    if (!crowd) return
    if (isMuted()) {
        crowdStop()
        return
    }

    const value = Math.max(0, Math.min(1, level))

    if (Math.abs(value - crowd.level) < 0.04) return

    crowd.level = value

    const { gain, filter, ctx } = crowd
    const t = ctx.currentTime

    gain.gain.cancelScheduledValues(t)
    gain.gain.setTargetAtTime(0.035 + value * 0.09, t, 0.6)
    filter.frequency.setTargetAtTime(460 + value * 360, t, 0.6)
}

// "Ồồ": cứu thua, sút trúng cột / chệch khung thành.
export function ooh(strength = 1) {
    const ctx = audioContext()
    if (!ctx) return

    burst(ctx, { type: 'bandpass', from: 380, to: 700, duration: 0.6, volume: 0.22 * strength, q: 2.2 })
    burst(ctx, { type: 'bandpass', start: 0.45, from: 700, to: 330, duration: 0.9, volume: 0.18 * strength, q: 2.2 })
}

// Hò reo khi có bàn thắng (to hơn khi đội mình ghi bàn).
export function roar(home = true) {
    const ctx = audioContext()
    if (!ctx) return

    const volume = home ? 0.5 : 0.22

    burst(ctx, { type: 'bandpass', from: 600, to: 1100, duration: 0.8, volume, q: 0.7 })
    burst(ctx, { type: 'bandpass', start: 0.5, from: 1000, to: 700, duration: 3.2, volume: volume * 0.8, q: 0.6 })
    burst(ctx, { type: 'lowpass', from: 300, to: 160, duration: 3.5, volume: volume * 0.5 })
}

// Sự kiện từ engine (ctx.onSound trong MatchWorld).
export function matchSoundEvent(type, data = {}) {
    if (isMuted()) return

    if (type === 'kick') kick(data.power ?? 0.5)
    else if (type === 'save') ooh(0.8)
    else if (type === 'miss') ooh(data.close ? 1 : 0.6)
    else if (type === 'foul') whistle('short')
    else if (type === 'whistle') whistle(data.kind)
}
