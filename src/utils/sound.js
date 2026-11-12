// Phase 25: âm thanh tự tạo bằng Web Audio (không cần file âm thanh) cho màn
// đập thẻ: nhịp tim, tiếng nổ khi thành công, tiếng trầm khi thất bại.
const MUTE_KEY = 'ufm-sound-muted'
let context = null

export function isMuted() {
    try {
        return localStorage.getItem(MUTE_KEY) === '1'
    } catch {
        return false
    }
}

export function setMuted(value) {
    try {
        localStorage.setItem(MUTE_KEY, value ? '1' : '0')
    } catch {
        // Trình duyệt chặn lưu trữ: chỉ áp dụng trong phiên này.
    }
}

// Phase 29B: dùng chung AudioContext cho âm thanh trận đấu (utils/matchSound.js).
export function audioContext() {
    return audio()
}

function audio() {
    if (isMuted() || typeof window === 'undefined') return null

    const Ctor = window.AudioContext || window.webkitAudioContext

    if (!Ctor) return null

    try {
        if (!context) context = new Ctor()
        if (context.state === 'suspended') context.resume()
    } catch {
        return null
    }

    return context
}

function tone(ctx, { type = 'sine', from, to = from, start = 0, duration = 0.2, volume = 0.3 }) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t0 = ctx.currentTime + start

    osc.type = type
    osc.frequency.setValueAtTime(from, t0)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + duration)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.02)
}

// "Thình thịch": hai nhịp trầm liền nhau, mạnh dần theo `intensity` (0..1).
export function playHeartbeat(intensity = 0.5) {
    const ctx = audio()
    if (!ctx) return

    const volume = 0.25 + intensity * 0.35

    tone(ctx, { from: 85, to: 42, duration: 0.22, volume })
    tone(ctx, { from: 70, to: 38, start: 0.13, duration: 0.2, volume: volume * 0.7 })
}

export function playSuccess(big = false) {
    const ctx = audio()
    if (!ctx) return

    const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047]

    notes.forEach((freq, index) => {
        tone(ctx, { type: 'triangle', from: freq, start: index * 0.07, duration: 0.45, volume: 0.18 })
    })
    tone(ctx, { type: 'sine', from: 160, to: 60, duration: 0.35, volume: 0.35 })
}

export function playFailure() {
    const ctx = audio()
    if (!ctx) return

    tone(ctx, { type: 'sawtooth', from: 260, to: 90, duration: 0.7, volume: 0.12 })
    tone(ctx, { type: 'sine', from: 110, to: 55, start: 0.05, duration: 0.5, volume: 0.25 })
}
