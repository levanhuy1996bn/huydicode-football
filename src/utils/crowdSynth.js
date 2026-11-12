// Phase 29F: tiếng khán giả tổng hợp bằng code (không có file âm thanh).
//
// Bản Phase 29B dùng tiếng ồn hồng qua một bộ lọc dải hẹp, đoạn lặp 2 giây,
// âm lượng / tần số đổi 4 lần mỗi giây → nghe như nước sôi ("sôi sùng sục").
// Bản này dựng tiếng đám đông từ nhiều "giọng người":
//   - mỗi giọng = nguồn có cao độ (dây thanh) + một chút hơi thở, qua 3 bộ lọc
//     formant của nguyên âm (a, e, i, o, u) → giống tiếng người nói / hô;
//   - tiếng rì rầm nền: 36 giọng nói chuyện (âm tiết ngắn, nghỉ ngẫu nhiên)
//     + lớp ồn trầm rất êm, đoạn lặp 7 giây ghép mượt ở chỗ nối;
//   - "Ồồ": 40 giọng cùng hô "ô… u" lên rồi xuống;
//   - hò reo bàn thắng: 44 giọng hô "aa / ee" cao giọng + tiếng vỗ tay.
// Hàm thuần JS (không cần AudioContext) → kiểm thử được trong Node; kết quả
// là Float32Array mono ở CROWD_RATE, matchSound.js chép vào AudioBuffer.
export const CROWD_RATE = 22050

const VOWELS = {
    a: [800, 1220, 2600],
    e: [480, 1850, 2550],
    i: [320, 2250, 2950],
    o: [520, 880, 2450],
    u: [360, 780, 2300],
}
const VOWEL_KEYS = Object.keys(VOWELS)
const FORMANT_Q = [5, 7, 9]
const FORMANT_GAIN = [1, 0.62, 0.3]

// Số ngẫu nhiên có hạt giống (cùng tiếng mỗi lần dựng).
function random(seed) {
    let value = seed >>> 0

    return () => {
        value = (value + 0x6d2b79f5) >>> 0
        let t = value
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// Bộ lọc biquad (RBJ). type: 'bandpass' (đỉnh 0 dB) | 'lowpass' | 'highpass'.
function biquad(type, freq, q) {
    const w = (2 * Math.PI * Math.min(freq, CROWD_RATE * 0.45)) / CROWD_RATE
    const cos = Math.cos(w)
    const alpha = Math.sin(w) / (2 * q)
    const a0 = 1 + alpha
    let b0
    let b1
    let b2

    if (type === 'bandpass') {
        b0 = alpha
        b1 = 0
        b2 = -alpha
    } else if (type === 'lowpass') {
        b0 = (1 - cos) / 2
        b1 = 1 - cos
        b2 = (1 - cos) / 2
    } else {
        b0 = (1 + cos) / 2
        b1 = -(1 + cos)
        b2 = (1 + cos) / 2
    }

    return {
        b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0,
        x1: 0, x2: 0, y1: 0, y2: 0,
    }
}

// Đặt lại tần số bộ lọc dải (giữ trạng thái → không bị "click"; không cấp phát).
function retune(filter, freq, q) {
    const w = (2 * Math.PI * Math.min(freq, CROWD_RATE * 0.45)) / CROWD_RATE
    const alpha = Math.sin(w) / (2 * q)
    const a0 = 1 + alpha

    filter.b0 = alpha / a0
    filter.b1 = 0
    filter.b2 = -alpha / a0
    filter.a1 = (-2 * Math.cos(w)) / a0
    filter.a2 = (1 - alpha) / a0
}

function run(filter, x) {
    const y = filter.b0 * x + filter.b1 * filter.x1 + filter.b2 * filter.x2 - filter.a1 * filter.y1 - filter.a2 * filter.y2

    filter.x2 = filter.x1
    filter.x1 = x
    filter.y2 = filter.y1
    filter.y1 = y

    return y
}

const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

// ---- Giọng người ----
// options:
//   seconds, voices, seed, pitch [lo, hi] (Hz), level
//   mode 'babble'  — nói chuyện: âm tiết syllable [min, max] giây, nghỉ với xác suất gap
//   mode 'chant'   — hô cùng lúc: vowels [đầu, cuối], envelope(t 0..1) → 0..1,
//                    contour(t) → hệ số cao độ, onset (giây, trễ ngẫu nhiên mỗi giọng)
// from / to: chỉ dựng giọng thứ from..to-1 (dựng dần từng phần, không làm giật trận).
function renderVoices(out, options, from = 0, to = Infinity) {
    const {
        seconds, voices, seed = 1, pitch = [100, 240], level = 1, mode = 'babble',
        syllable = [0.12, 0.32], gap = 0.35, vowels = ['o', 'u'], envelope = () => 1,
        contour = () => 1, onset = 0.2, vowelMix = null,
    } = options
    const length = Math.min(out.length, Math.round(seconds * CROWD_RATE))
    const block = 64

    for (let v = from; v < Math.min(voices, to); v += 1) {
        // Mỗi giọng một hạt giống riêng → dựng từng phần vẫn ra đúng một kết quả.
        const rand = random(seed * 7919 + v * 104729)
        const base = pitch[0] * Math.pow(pitch[1] / pitch[0], rand())
        const amp = (0.55 + rand() * 0.45) * level
        const vibratoRate = 4.5 + rand() * 2
        const vibratoDepth = 0.008 + rand() * 0.012
        const drift = (rand() - 0.5) * 0.08
        const breath = 0.12 + rand() * 0.12
        const filters = FORMANT_Q.map((q) => biquad('bandpass', 500, q))
        const current = [500, 1500, 2500]
        let phase = rand()
        let vib = rand() * Math.PI * 2

        // Âm tiết / đoạn hô của giọng này.
        let segStart = mode === 'chant' ? Math.round(rand() * onset * CROWD_RATE) : Math.round(rand() * 0.4 * CROWD_RATE)
        let segLength = 0
        let sounding = false
        let target = VOWELS.o
        let segGain = 1
        const chantVowels = vowelMix
            ? [vowelMix[Math.floor(rand() * vowelMix.length)], vowelMix[Math.floor(rand() * vowelMix.length)]]
            : vowels
        const startVowel = VOWELS[chantVowels[0]] || VOWELS.o
        const endVowel = VOWELS[chantVowels[1] || chantVowels[0]] || startVowel

        if (mode === 'chant') {
            sounding = true
            segLength = length - segStart
            current[0] = startVowel[0]
            current[1] = startVowel[1]
            current[2] = startVowel[2]
        } else {
            segLength = 0
        }

        for (let i = 0; i < length; i += 1) {
            // Âm tiết tiếp theo (nói chuyện).
            if (mode === 'babble' && i >= segStart + segLength) {
                segStart = i
                segLength = Math.round((syllable[0] + rand() * (syllable[1] - syllable[0])) * CROWD_RATE)
                sounding = rand() > gap
                target = VOWELS[VOWEL_KEYS[Math.floor(rand() * VOWEL_KEYS.length)]]
                segGain = 0.6 + rand() * 0.4

                if (!sounding) {
                    // Im lặng: bỏ qua cả âm tiết (âm tiết sau bắt đầu từ 0 nên không bị "click").
                    filters.forEach((filter) => {
                        filter.x1 = filter.x2 = filter.y1 = filter.y2 = 0
                    })
                }
            }

            if (mode === 'babble' && !sounding) continue
            if (i < segStart && mode === 'chant') continue

            // Cập nhật formant mỗi 64 mẫu (trượt mượt giữa các nguyên âm).
            if (i % block === 0) {
                let goal = target

                if (mode === 'chant') {
                    const t = (i - segStart) / Math.max(1, segLength)
                    const k = smoothstep(t * 1.4 - 0.2)

                    goal = [
                        startVowel[0] + (endVowel[0] - startVowel[0]) * k,
                        startVowel[1] + (endVowel[1] - startVowel[1]) * k,
                        startVowel[2] + (endVowel[2] - startVowel[2]) * k,
                    ]
                }

                for (let f = 0; f < 3; f += 1) {
                    current[f] += (goal[f] - current[f]) * 0.25
                    retune(filters[f], current[f] * (1 + drift * 0.5), FORMANT_Q[f])
                }
            }

            const t = i / CROWD_RATE
            let gain

            if (mode === 'chant') {
                gain = envelope(t / seconds)
            } else {
                const s = (i - segStart) / segLength
                gain = Math.sin(Math.PI * s) ** 2 * segGain
            }

            vib += (2 * Math.PI * vibratoRate) / CROWD_RATE
            const f0 = base * (1 + drift) * (1 + Math.sin(vib) * vibratoDepth) * contour(t / seconds)

            phase += f0 / CROWD_RATE
            if (phase >= 1) phase -= 1

            // Nguồn: răng cưa mềm (dây thanh) + hơi thở.
            const source = (2 * phase - 1) * (1 - breath) + (rand() * 2 - 1) * breath

            const shaped =
                run(filters[0], source) * FORMANT_GAIN[0] +
                run(filters[1], source) * FORMANT_GAIN[1] +
                run(filters[2], source) * FORMANT_GAIN[2]

            out[i] += shaped * gain * amp
        }
    }
}

// Lớp ồn nền rất êm (tiếng sân vận động xa): ồn hồng, cắt dưới 140 Hz và
// trên ~900 Hz, không có bộ lọc cộng hưởng.
function renderNoiseBed(out, { seed = 7, level = 1, low = 140, high = 900 }) {
    const rand = random(seed)
    const hp = biquad('highpass', low, 0.707)
    const lp1 = biquad('lowpass', high, 0.707)
    const lp2 = biquad('lowpass', high * 1.4, 0.707)
    let b0 = 0
    let b1 = 0
    let b2 = 0

    for (let i = 0; i < out.length; i += 1) {
        const white = rand() * 2 - 1

        b0 = 0.99765 * b0 + white * 0.099046
        b1 = 0.963 * b1 + white * 0.2965164
        b2 = 0.57 * b2 + white * 1.0526913

        const pink = (b0 + b1 + b2 + white * 0.1848) * 0.2

        out[i] += run(lp2, run(lp1, run(hp, pink))) * level
    }
}

// Vỗ tay: nhiều tiếng "bép" ngắn (8 ms) ở 1–2.6 kHz, mật độ theo density(t).
function renderApplause(out, { seed = 11, start = 0, seconds, perSecond = 60, density = () => 1, level = 1 }) {
    const rand = random(seed)
    const from = Math.round(start * CROWD_RATE)
    const to = Math.min(out.length, from + Math.round(seconds * CROWD_RATE))
    const clapLength = Math.round(0.03 * CROWD_RATE)
    const decay = Math.exp(-1 / (0.006 * CROWD_RATE))
    let i = from

    while (i < to) {
        const t = (i - from) / Math.max(1, to - from)
        const rate = Math.max(1, perSecond * density(t))

        i += Math.max(1, Math.round((-Math.log(1 - rand() * 0.999) / rate) * CROWD_RATE))

        if (i >= to) break

        const filter = biquad('bandpass', 1000 + rand() * 1600, 1.4)
        const amp = (0.4 + rand() * 0.6) * level * density(t)
        let env = 1

        for (let k = 0; k < clapLength && i + k < out.length; k += 1) {
            out[i + k] += run(filter, rand() * 2 - 1) * env * amp
            env *= decay
        }
    }
}

function normalize(out, peak = 0.9) {
    let max = 0

    for (let i = 0; i < out.length; i += 1) max = Math.max(max, Math.abs(out[i]))

    if (max > 0) {
        const scale = peak / max

        for (let i = 0; i < out.length; i += 1) out[i] *= scale
    }

    return out
}

// Đoạn lặp ghép mượt: dựng dài hơn `fade` giây, trộn phần thừa vào đầu đoạn
// (equal-power) → không nghe ra chỗ nối.
function foldLoop(raw, seconds, fade) {
    const length = Math.round(seconds * CROWD_RATE)
    const fadeLength = Math.round(fade * CROWD_RATE)
    const out = raw.slice(0, length)

    for (let i = 0; i < fadeLength; i += 1) {
        const k = i / fadeLength

        out[i] = raw[i] * Math.sin((k * Math.PI) / 2) + raw[length + i] * Math.cos((k * Math.PI) / 2)
    }

    return out
}

// Chia việc dựng giọng thành từng bước nhỏ (4 giọng / bước, ~30 ms).
function voiceSteps(options, perStep = 4) {
    const steps = []

    for (let from = 0; from < options.voices; from += perStep) {
        steps.push((out) => renderVoices(out, options, from, from + perStep))
    }

    return steps
}

// ---- Các âm thanh dùng trong trận ----
// Mỗi "công thức": seconds (độ dài bộ đệm thô), steps (các bước dựng, chạy lần
// lượt — matchSound.js chạy xen giữa các khung hình), finish (bộ đệm thô → kết quả).
const MURMUR = { seconds: 7, fade: 0.6 }
const BED = { seconds: 6, fade: 0.5 }
const OOH_SECONDS = 1.9
const ROAR_SECONDS = 3.8

export const CROWD_RECIPES = {
    // Tiếng rì rầm nền (lặp): 36 giọng nói chuyện, 7 giây.
    murmur: {
        seconds: MURMUR.seconds + MURMUR.fade,
        steps: voiceSteps({ seconds: MURMUR.seconds + MURMUR.fade, voices: 36, seed: 21, pitch: [95, 250], mode: 'babble' }),
        finish: (raw) => normalize(foldLoop(raw, MURMUR.seconds, MURMUR.fade), 0.8),
    },
    // Lớp ồn nền (lặp): 6 giây — khác độ dài với tiếng rì rầm để không lặp cùng nhịp.
    bed: {
        seconds: BED.seconds + BED.fade,
        steps: [(out) => renderNoiseBed(out, { seed: 5 })],
        finish: (raw) => normalize(foldLoop(raw, BED.seconds, BED.fade), 0.8),
    },
    // "Ồồ": 40 giọng hô "ô… u", cao độ lên rồi xuống.
    ooh: {
        seconds: OOH_SECONDS,
        steps: voiceSteps({
            seconds: OOH_SECONDS,
            voices: 40,
            seed: 33,
            pitch: [120, 290],
            mode: 'chant',
            vowels: ['o', 'u'],
            onset: 0.18,
            envelope: (t) => smoothstep(t / 0.18) * (1 - smoothstep((t - 0.45) / 0.55)),
            contour: (t) => 1 + 0.18 * Math.sin(Math.PI * Math.min(1, t * 1.6)) - 0.12 * t,
        }),
        finish: (raw) => normalize(raw, 0.9),
    },
    // Hò reo bàn thắng: 44 giọng "aa / ee" + ồn + vỗ tay.
    roar: {
        seconds: ROAR_SECONDS,
        steps: [
            ...voiceSteps({
                seconds: ROAR_SECONDS,
                voices: 44,
                seed: 47,
                pitch: [150, 340],
                mode: 'chant',
                vowelMix: ['a', 'e', 'a', 'o'],
                onset: 0.12,
                envelope: (t) => smoothstep(t / 0.06) * (1 - 0.35 * smoothstep((t - 0.1) / 0.3)) * (1 - smoothstep((t - 0.45) / 0.55)),
                contour: (t) => 1 + 0.12 * (1 - t),
            }),
            (out) => renderNoiseBed(out, { seed: 9, level: 0.5, low: 160, high: 1300 }),
            (out) => renderApplause(out, {
                seed: 13,
                start: 0.25,
                seconds: ROAR_SECONDS - 0.25,
                perSecond: 140,
                level: 0.6,
                density: (t) => 1 - smoothstep((t - 0.2) / 0.8),
            }),
        ],
        finish: (raw) => normalize(raw, 0.92),
    },
}

// Dựng cả một âm thanh ngay (kiểm thử / khi cần gấp).
export function renderCrowdSound(name) {
    const recipe = CROWD_RECIPES[name]
    const raw = new Float32Array(Math.round(recipe.seconds * CROWD_RATE))

    recipe.steps.forEach((step) => step(raw))

    return recipe.finish(raw)
}

// Thống kê để kiểm thử (Node): RMS và độ nhảy lớn nhất giữa hai mẫu liền nhau.
export function bufferStats(data) {
    let sum = 0
    let jump = 0

    for (let i = 0; i < data.length; i += 1) {
        sum += data[i] * data[i]
        if (i > 0) jump = Math.max(jump, Math.abs(data[i] - data[i - 1]))
    }

    return { rms: Math.sqrt(sum / data.length), jump, loopJump: Math.abs(data[0] - data[data.length - 1]) }
}
