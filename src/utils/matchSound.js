// Phase 29B: âm thanh trận đấu tạo bằng Web Audio (không có file âm thanh):
// còi trọng tài, tiếng sút / chuyền, tiếng khán giả nền (to dần khi bóng gần
// khung thành), "ồ" khi cứu thua / sút trượt, hò reo khi có bàn thắng.
// Tắt / bật chung với SOUND ON / OFF (utils/sound.js).
//
// Phase 29F: tiếng khán giả làm lại (utils/crowdSynth.js — giọng người tổng
// hợp thay cho tiếng ồn lọc dải nghe "sôi sùng sục"), âm lượng đổi chậm
// (~1.5 giây), thêm Crowd volume (OFF / LOW / MEDIUM) trong Settings.
import { audioContext, isMuted } from './sound'
import { CROWD_RATE, CROWD_RECIPES } from './crowdSynth'

let noiseBuffer = null
let crowd = null // { ctx, bed, murmur, level }

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

// ---- Khán giả (Phase 29F) ----
export const CROWD_VOLUMES = { off: 0, low: 0.5, medium: 1 }
let crowdVolume = 1

// Dữ liệu âm thanh đã dựng (Float32Array) + việc dựng đang chạy.
const crowdData = {}
const crowdJobs = {}
const crowdWaiters = {}
const bufferCache = new WeakMap() // AudioContext → { name: AudioBuffer }
const busCache = new WeakMap() // AudioContext → GainNode (âm lượng khán giả)

// Dựng từng bước xen giữa các khung hình (mỗi bước ~10–30 ms).
function buildCrowd(name, onReady) {
    if (crowdData[name]) {
        onReady?.(crowdData[name])
        return
    }

    if (onReady) (crowdWaiters[name] ||= []).push(onReady)
    if (crowdJobs[name]) return

    const recipe = CROWD_RECIPES[name]
    const job = { raw: new Float32Array(Math.round(recipe.seconds * CROWD_RATE)), next: 0 }

    crowdJobs[name] = job

    const tick = () => {
        if (job.next < recipe.steps.length) {
            recipe.steps[job.next](job.raw)
            job.next += 1
            setTimeout(tick, 0)
            return
        }

        crowdData[name] = recipe.finish(job.raw)
        delete crowdJobs[name]
        ;(crowdWaiters[name] || []).forEach((callback) => callback(crowdData[name]))
        delete crowdWaiters[name]
    }

    setTimeout(tick, 0)
}

// Dựng sẵn mọi tiếng khán giả (gọi khi vào trận).
export function prepareCrowdSounds() {
    ;['bed', 'murmur', 'ooh', 'roar'].forEach((name) => buildCrowd(name))
}

function crowdBuffer(ctx, name) {
    const data = crowdData[name]

    if (!data) return null

    let cache = bufferCache.get(ctx)

    if (!cache) {
        cache = {}
        bufferCache.set(ctx, cache)
    }

    if (!cache[name]) {
        const buffer = ctx.createBuffer(1, data.length, CROWD_RATE)

        buffer.copyToChannel(data, 0)
        cache[name] = buffer
    }

    return cache[name]
}

function crowdBus(ctx) {
    let bus = busCache.get(ctx)

    if (!bus) {
        bus = ctx.createGain()
        bus.gain.value = crowdVolume
        bus.connect(ctx.destination)
        busCache.set(ctx, bus)
    }

    return bus
}

export function setCrowdVolume(key) {
    crowdVolume = CROWD_VOLUMES[key] ?? 1

    if (crowd) {
        crowdBus(crowd.ctx).gain.setTargetAtTime(crowdVolume, crowd.ctx.currentTime, 0.2)
        if (crowdVolume === 0) crowdStop()
    }
}

// Mức âm lượng hai lớp theo độ sôi động 0..1.
const BED_GAIN = (level) => 0.05 + level * 0.035
const MURMUR_GAIN = (level) => 0.06 + level * 0.09

function startLayer(ctx, name, volume) {
    const buffer = crowdBuffer(ctx, name)

    if (!buffer) return null

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()

    source.buffer = buffer
    source.loop = true
    gain.gain.value = 0.0001
    source.connect(gain).connect(crowdBus(ctx))
    // Bắt đầu ở vị trí ngẫu nhiên để mỗi trận nghe hơi khác.
    source.start(ctx.currentTime, Math.random() * buffer.duration)
    gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.7)

    return { source, gain }
}

export function crowdStart() {
    const ctx = audioContext()
    if (!ctx || crowd || crowdVolume === 0) return

    const session = { ctx, bed: null, murmur: null, level: 0.3 }

    crowd = session

    const attach = (name) => () => {
        // Trận đã dừng / bắt đầu lại trong lúc đang dựng.
        if (crowd !== session || session[name]) return

        session[name] = startLayer(ctx, name, name === 'bed' ? BED_GAIN(session.level) : MURMUR_GAIN(session.level))
    }

    buildCrowd('bed', attach('bed'))
    buildCrowd('murmur', attach('murmur'))
    buildCrowd('ooh')
    buildCrowd('roar')
}

export function crowdStop() {
    if (!crowd) return

    const { ctx } = crowd

    ;[crowd.bed, crowd.murmur].forEach((layer) => {
        if (!layer) return

        try {
            layer.gain.gain.cancelScheduledValues(ctx.currentTime)
            layer.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25)
            layer.source.stop(ctx.currentTime + 1.2)
        } catch {
            // đã dừng
        }
    })

    crowd = null
}

// level 0..1: bóng ở giữa sân → gần khung thành. Chỉ đổi khi chênh đủ lớn,
// lên / xuống chậm (hằng số thời gian 1.5 giây) → không còn "sôi sùng sục".
export function crowdIntensity(level) {
    if (!crowd) return
    if (isMuted()) {
        crowdStop()
        return
    }

    const value = Math.max(0, Math.min(1, level))

    if (Math.abs(value - crowd.level) < 0.1) return

    crowd.level = value

    const t = crowd.ctx.currentTime

    crowd.bed?.gain.gain.setTargetAtTime(BED_GAIN(value), t, 1.5)
    crowd.murmur?.gain.gain.setTargetAtTime(MURMUR_GAIN(value), t, 1.5)
}

function playCrowd(name, volume, rate = 1) {
    const ctx = audioContext()
    if (!ctx || crowdVolume === 0) return

    const buffer = crowdBuffer(ctx, name)

    // Chưa dựng xong (vài giây đầu trận): bỏ qua lần này, dựng cho lần sau.
    if (!buffer) {
        buildCrowd(name)
        return
    }

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()

    source.buffer = buffer
    source.playbackRate.value = rate
    gain.gain.value = volume
    source.connect(gain).connect(crowdBus(ctx))
    source.start()
}

// "Ồồ": cứu thua, sút trúng cột / chệch khung thành.
export function ooh(strength = 1) {
    playCrowd('ooh', 0.42 * strength, 0.94 + Math.random() * 0.12)
}

// Hò reo khi có bàn thắng (to hơn khi đội mình ghi bàn).
export function roar(home = true) {
    playCrowd('roar', home ? 0.7 : 0.3, home ? 1 : 0.92)
}

// Sự kiện từ engine (ctx.onSound trong MatchWorld).
export function matchSoundEvent(type, data = {}) {
    if (isMuted()) return

    if (type === 'kick') kick(data.power ?? 0.5)
    else if (type === 'save') ooh(0.8)
    else if (type === 'miss') ooh(data.close ? 1 : 0.6)
    else if (type === 'foul') whistle('short')
    else if (type === 'whistle') whistle(data.kind)
    // Phase 29D: luân lưu — vào lưới (khán giả reo, to hơn nếu đội mình sút) / hỏng.
    else if (type === 'pen-goal') roar(Boolean(data.user))
    else if (type === 'pen-miss') ooh(0.9)
}
