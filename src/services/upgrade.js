// Phase 25: nâng cấp thẻ cầu thủ (+1 → +10).
//
// - Cộng vào MỌI chỉ số theo cấp thẻ (bảng UPGRADE_BONUS).
// - Đập: thẻ chính + 1 thẻ nguyên liệu cùng cầu thủ (playerId) ở đội hình
//   ngoài, thêm tối đa 5 thẻ phụ (+tối đa 10% tổng). Nguyên liệu và thẻ phụ
//   luôn mất. Thất bại từ +5 tụt đúng 1 cấp. Không tốn EP.
// Không import systems/progression (tránh vòng phụ thuộc).

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

export function successRate(main, material, extras = []) {
    const current = main.upgrade || 1

    if (!material || current >= MAX_UPGRADE) return 0

    const base = BASE_RATES[current + 1] ?? 0
    const factor = materialFactor((material.upgrade || 1) - current)
    const extra = Math.min(
        EXTRA_TOTAL,
        extras.slice(0, EXTRA_LIMIT).reduce((sum, card) => sum + extraBonus(main, card), 0),
    )

    return Math.max(0, Math.min(1, base * factor + extra))
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

    if (!delta) return next

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

    return next
}

// Thực hiện một lần đập (đã có tỉ lệ). random() < rate → thành công.
export function rollUpgrade(main, material, extras, random = Math.random) {
    const rate = successRate(main, material, extras)
    const from = main.upgrade || 1
    const success = random() < rate
    const to = success ? from + 1 : levelAfterFailure(from)

    return { success, rate, from, to, player: applyUpgradeLevel(main, to) }
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
