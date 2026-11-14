// Phase 25: nâng cấp thẻ cầu thủ (+1 → +10).
//
// - Cộng vào MỌI chỉ số theo cấp thẻ (bảng UPGRADE_BONUS).
// - Đập: thẻ chính + 1 thẻ nguyên liệu cùng cầu thủ (playerId) ở đội hình
//   ngoài, thêm tối đa 5 thẻ phụ (+tối đa 10% tổng). Nguyên liệu và thẻ phụ
//   luôn mất. Thất bại từ +5 tụt đúng 1 cấp. Không tốn EP.
// Không import systems/progression (tránh vòng phụ thuộc).
import { devUpgradeBonus } from '../utils/devTools'
import { settlePeakCard } from '../systems/form'

export const MAX_UPGRADE = 10

// Chỉ số cộng thêm ở mỗi cấp thẻ (so với +1).
export const UPGRADE_BONUS = [0, 0, 2, 3, 5, 7, 8, 11, 14, 18, 24] // index = cấp

export const upgradeBonus = (level) => UPGRADE_BONUS[Math.max(1, Math.min(MAX_UPGRADE, level || 1))]

// Tỉ lệ gốc để lên cấp `target` (2…10).
export const BASE_RATES = { 2: 1, 3: 0.8, 4: 0.65, 5: 0.5, 6: 0.35, 7: 0.25, 8: 0.15, 9: 0.08, 10: 0.05 }

// Hệ số theo cấp thẻ nguyên liệu so với thẻ chính (diff = nguyên liệu − chính).
export function materialFactor(diff) {
    if (diff >= 1) return 1.25
    if (diff === 0) return 1
    if (diff === -1) return 0.7
    if (diff === -2) return 0.5
    return 0.35
}

export const EXTRA_LIMIT = 5
export const EXTRA_EACH = 0.02
export const EXTRA_TOTAL = 0.1
const EXTRA_CURVE = 3.2

// Thẻ phụ: tối đa +2% mỗi thẻ theo OVR (đã gồm cấp +) so với thẻ chính.
export function extraBonus(main, extra) {
    const ratio = Math.max(0, Math.min(1, (extra.overall || 0) / Math.max(1, main.overall || 1)))

    return EXTRA_EACH * Math.pow(ratio, EXTRA_CURVE)
}

// ---- Phase 29C: bảo hiểm khi thất bại ----
// Mỗi lần hỏng ở cùng một cấp đích → lần sau ở cấp đó +5 điểm %, tối đa +30.
// Lưu trên thẻ theo cấp đích (card.insurance = { 9: 0.15 }), nên hỏng bị tụt
// cấp rồi leo lại vẫn còn; thành công ở cấp đó thì về 0.
export const INSURANCE_STEP = 0.05
export const INSURANCE_MAX = 0.3

export const insuranceOf = (card, target = (card?.upgrade || 1) + 1) =>
    Math.max(0, Math.min(INSURANCE_MAX, card?.insurance?.[target] || 0))

// Thẻ bảo vệ chỉ có tác dụng khi thất bại làm tụt cấp (từ +5).
export const protectionUseful = (card) => {
    const level = card?.upgrade || 1

    return level >= 5 && level < MAX_UPGRADE
}

// Chi tiết tỉ lệ: base (gốc × nguyên liệu + thẻ phụ), insurance, boost
// (Phase 29I: tổng % các thẻ tăng tỉ lệ đang dùng, 0..0.25), total.
export function rateBreakdown(main, material, extras = [], boost = 0) {
    const current = main?.upgrade || 1

    if (!main || !material || current >= MAX_UPGRADE) return { base: 0, insurance: 0, boost: 0, dev: 0, total: 0 }

    const baseRate = BASE_RATES[current + 1] ?? 0
    const factor = materialFactor((material.upgrade || 1) - current)
    const extra = Math.min(
        EXTRA_TOTAL,
        extras.slice(0, EXTRA_LIMIT).reduce((sum, card) => sum + extraBonus(main, card), 0),
    )
    const base = Math.max(0, Math.min(1, baseRate * factor + extra))
    const insurance = insuranceOf(main, current + 1)
    const boosted = Math.max(0, Math.min(0.25, boost || 0))
    // Phase 34: +% từ bảng DEV (chỉ trong phiên, mặc định 0).
    const dev = devUpgradeBonus()

    return { base, insurance, boost: boosted, dev, total: Math.min(1, base + insurance + boosted + dev) }
}

export function successRate(main, material, extras = []) {
    return rateBreakdown(main, material, extras).total
}

function withInsurance(card, target, success) {
    const insurance = { ...(card.insurance || {}) }

    if (success) delete insurance[target]
    else insurance[target] = Math.min(INSURANCE_MAX, Math.round(((insurance[target] || 0) + INSURANCE_STEP) * 100) / 100)

    const next = { ...card }

    if (Object.keys(insurance).length) next.insurance = insurance
    else delete next.insurance

    return next
}

// Kết quả thất bại: dưới +5 giữ nguyên, từ +5 tụt 1 cấp.
export const levelAfterFailure = (level) => (level >= 5 ? level - 1 : level)

// Giá trị thẻ theo cấp + (giá bán / giá trị đội hình).
export const UPGRADE_VALUE = [1, 1, 1.2, 1.4, 1.8, 2.5, 3.2, 4.5, 7, 11, 20]
export const upgradeValueFactor = (level) => UPGRADE_VALUE[Math.max(1, Math.min(MAX_UPGRADE, level || 1))]

const MAIN_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

// Đổi cấp thẻ: cộng/trừ chênh lệch bonus vào mọi chỉ số (6 chỉ số chính,
// chỉ số chi tiết đã cộng điểm và bản gốc của chúng, OVR). Không giới hạn 99.
export function applyUpgradeLevel(player, level) {
    const from = player.upgrade || 1
    const to = Math.max(1, Math.min(MAX_UPGRADE, level))
    const delta = upgradeBonus(to) - upgradeBonus(from)
    const next = { ...player, upgrade: to }

    // Phase 40: lên +10 → thể lực 100%, phong độ cao nhất ngay.
    if (!delta) return settlePeakCard(next)

    MAIN_KEYS.forEach((key) => {
        if (typeof next[key] === 'number') next[key] += delta
        if (typeof next[`${key}Base`] === 'number') next[`${key}Base`] += delta
    })

    next.overall = (next.overall || 0) + delta
    if (typeof next.baseOverall === 'number') next.baseOverall += delta

    const shift = (values) =>
        values ? Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value + delta])) : values

    if (next.attributes) next.attributes = shift(next.attributes)
    if (next.attributesBase) next.attributesBase = shift(next.attributesBase)

    return settlePeakCard(next)
}

// Thực hiện một lần đập (đã có tỉ lệ). random() < rate → thành công.
// Phase 29C: protect = dùng thẻ bảo vệ (thất bại không tụt cấp); bảo hiểm
// của cấp đích tăng khi thất bại, về 0 khi thành công.
export function rollUpgrade(main, material, extras, random = Math.random, { protect = false, boost = 0 } = {}) {
    const breakdown = rateBreakdown(main, material, extras, boost)
    const rate = breakdown.total
    const from = main.upgrade || 1
    const target = from + 1
    const success = random() < rate
    const dropTo = levelAfterFailure(from)
    const protectedDrop = !success && protect && dropTo < from
    const to = success ? target : protect ? from : dropTo
    const player = withInsurance(applyUpgradeLevel(main, to), target, success)

    return {
        success,
        rate,
        breakdown,
        from,
        to,
        protectUsed: Boolean(protect),
        protectedDrop,
        insuranceNext: success ? 0 : insuranceOf(player, target),
        player,
    }
}

// Màu ô +N: xám / đồng / bạc / vàng / kim cương.
export function upgradeTier(level) {
    if (level >= 10) return 'diamond'
    if (level >= 8) return 'gold'
    if (level >= 5) return 'silver'
    if (level >= 2) return 'bronze'
    return 'grey'
}

// Màu số chỉ số: thường (1–98), cam (99), tím (100–120), vàng (> 120).
export function statTier(value) {
    if (value > 120) return 'gold'
    if (value >= 100) return 'purple'
    if (value >= 99) return 'orange'
    return ''
}
