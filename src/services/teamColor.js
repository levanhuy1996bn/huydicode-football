// Phase 26D: team color (kiểu FC Online), tính trên 11 người đang đá chính.
//
// 1. Team color cấp thẻ: bậc của CẢ ĐỘI = theo thẻ có cấp THẤP NHẤT trong 11
//    người (đồng ≥ +2, bạc ≥ +5, vàng ≥ +8, kim cương +10). Có 1 người +1 thì
//    không có. Thay người tính lại ngay (11 người +5, thay 1 người +3 vào →
//    tụt xuống đồng; người +1 vào → mất).
// 2. Team color CLB: cả 11 người cùng một CLB thật → +3. CLB của thẻ = CLB
//    của cầu thủ (thẻ Saka = Arsenal; đội hình gốc = Man United; cầu thủ tự do
//    không thuộc CLB nào).
// Hai loại cộng dồn, cộng vào 6 chỉ số chính (+ OVR) của cả 11 người, chỉ
// trong trận — không ghi vào thẻ. Thẻ đỏ không làm mất team color (người bị
// đuổi vẫn được tính). Đội AI cũng có team color như đội người chơi.
import { CLUB_BY_ID, worldClub } from '../data/world'
import { ORIGINAL_SQUAD_CLUB, normalizeClubId } from './career'

export const UPGRADE_COLORS = [
    { id: 'diamond', label: 'Diamond', min: 10, bonus: 6 },
    { id: 'gold', label: 'Gold', min: 8, bonus: 4 },
    { id: 'silver', label: 'Silver', min: 5, bonus: 2 },
    { id: 'bronze', label: 'Bronze', min: 2, bonus: 1 },
]

export const CLUB_COLOR_BONUS = 3
export const TEAM_COLOR_SIZE = 11

const MAIN_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

// CLB của một thẻ / cầu thủ (null = cầu thủ tự do).
export function clubOfPlayer(player) {
    if (!player) return null
    if (player.clubId !== undefined) return player.clubId ? normalizeClubId(player.clubId) : null

    const id = String(player.playerId || player.id || '')

    // Đội hình gốc Man United: blue-9, blue-sub-12…
    if (/^blue-(sub-)?\d+$/.test(id)) return ORIGINAL_SQUAD_CLUB

    // Cầu thủ thế giới: <clubId>-p01…p22 (bản cũ: blue-p01 = Man United)
    const match = /^(.+)-p\d{2}$/.exec(id)
    const clubId = match ? normalizeClubId(match[1]) : null

    if (clubId && CLUB_BY_ID.has(clubId)) return clubId

    return null
}

const levelOf = (player) => player?.upgrade || 1

// Bậc tiếp theo cao hơn bậc hiện tại (để gợi ý "còn thiếu gì").
function nextColor(current) {
    const index = current ? UPGRADE_COLORS.findIndex((color) => color.id === current.id) : UPGRADE_COLORS.length

    return index > 0 ? UPGRADE_COLORS[index - 1] : null
}

// Team color của một đội hình chính (danh sách 11 người).
export function teamColorOf(players = []) {
    const list = players.filter(Boolean)
    const full = list.length >= TEAM_COLOR_SIZE
    const lowest = list.length ? Math.min(...list.map(levelOf)) : 1
    const upgrade = full ? UPGRADE_COLORS.find((color) => lowest >= color.min) || null : null
    const next = nextColor(upgrade)
    const belowNext = next ? list.filter((player) => levelOf(player) < next.min).length : 0

    // CLB đông nhất trong đội hình.
    const counts = new Map()

    list.forEach((player) => {
        const clubId = clubOfPlayer(player)

        if (clubId) counts.set(clubId, (counts.get(clubId) || 0) + 1)
    })

    const [topClubId, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0]
    const clubActive = full && topClubId && topCount === list.length

    const bonus = (upgrade?.bonus || 0) + (clubActive ? CLUB_COLOR_BONUS : 0)

    return {
        size: list.length,
        lowest,
        upgrade,
        next,
        belowNext,
        club: topClubId
            ? {
                clubId: topClubId,
                name: worldClub(topClubId)?.name || String(topClubId).toUpperCase(),
                count: topCount,
                active: Boolean(clubActive),
                bonus: clubActive ? CLUB_COLOR_BONUS : 0,
            }
            : null,
        bonus,
    }
}

// Cộng điểm team color vào một cầu thủ (bản sao dùng trong trận).
export function withTeamColor(player, bonus) {
    if (!bonus || !player) return player

    const next = { ...player, teamColorBonus: bonus, overall: (player.overall || 0) + bonus }

    MAIN_KEYS.forEach((key) => {
        if (typeof next[key] === 'number') next[key] += bonus
    })

    if (next.attributes) {
        next.attributes = Object.fromEntries(
            Object.entries(next.attributes).map(([key, value]) => [key, typeof value === 'number' ? value + bonus : value]),
        )
    }

    return next
}

// Cả đội (đội hình chính) đã cộng team color.
export function applyTeamColor(players = []) {
    const info = teamColorOf(players)

    return { info, players: players.map((player) => withTeamColor(player, info.bonus)) }
}
