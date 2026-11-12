// Phase 26C: độ khó của mùa giải (chọn trước trận đầu tiên của mùa, khoá
// trong suốt mùa). Độ khó = cấp thẻ +N của cầu thủ đối thủ trong trận 3D
// (dùng đúng bảng cộng điểm của Phase 25: +3 = +3, +5 = +7, +7 = +11, +9 = +18),
// lệch ±1 giữa các cầu thủ cho tự nhiên. Từ mức Khó, AI đối thủ còn quyết
// định nhanh hơn. Thưởng XP / EP sau trận và thưởng cuối mùa nhân theo độ khó.
// Chỉ ảnh hưởng trận người chơi đá: các trận AI gặp AI giữ nguyên.
import { hashString } from '../data/world'

export const DIFFICULTIES = [
    { id: 'easy', label: 'Easy', upgrade: 1, reward: 0.8, aiSpeed: 1.15 },
    { id: 'normal', label: 'Normal', upgrade: 3, reward: 1, aiSpeed: 1 },
    { id: 'hard', label: 'Hard', upgrade: 5, reward: 1.3, aiSpeed: 0.88 },
    { id: 'veryhard', label: 'Very hard', upgrade: 7, reward: 1.6, aiSpeed: 0.78 },
    { id: 'legendary', label: 'Legendary', upgrade: 9, reward: 2, aiSpeed: 0.68 },
]

export const DEFAULT_DIFFICULTY = 'normal'

export const difficultyOf = (id) =>
    DIFFICULTIES.find((item) => item.id === id) || DIFFICULTIES.find((item) => item.id === DEFAULT_DIFFICULTY)

// Cấp thẻ của một cầu thủ đối thủ: mức của độ khó ±1 (cố định theo mùa + cầu thủ).
export function aiUpgradeFor(difficultyId, playerId, season = 0) {
    const base = difficultyOf(difficultyId).upgrade
    const shift = (hashString(`${season}:${playerId}`) % 3) - 1

    return Math.max(1, Math.min(10, base + shift))
}
