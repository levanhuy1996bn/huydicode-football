// Phase 29I: phong độ cầu thủ (tách riêng khỏi thể lực / condition).
//
// player.form: −2 … +2 (mặc định 0). 5 mức, mũi tên màu kiểu FO4:
//   −2 ⬇ rất tệ  −3 · −1 ↘ tệ −1 · 0 ➡ bình thường · +1 ↗ tốt +1 · +2 ⬆ rất tốt +3
// điểm cộng vào cả 6 chỉ số chính (→ mọi chỉ số chi tiết, OVR) trong trận và
// trong mô phỏng nhanh — tức là ảnh hưởng thật tới cách đá.
// Sau mỗi trận (applyFormAfterMatch): điểm trận ≥ 7.5 dễ lên một bậc, ≤ 5.5
// dễ xuống một bậc, ở giữa thỉnh thoảng lên / xuống; không ra sân thì dần về 0.
// Đội AI: phong độ ngẫu nhiên mỗi trận (cố định theo trận, roster.js).
// Thẻ Phong độ (Form card) đưa cả đội lên +2.

export const FORM_MIN = -2
export const FORM_MAX = 2

export const FORM_LEVELS = {
    [-2]: { bonus: -3, arrow: '⬇', label: 'Very poor', color: '#ff5a4f' },
    [-1]: { bonus: -1, arrow: '↘', label: 'Poor', color: '#ff9f43' },
    0: { bonus: 0, arrow: '➡', label: 'Normal', color: '#ffd166' },
    1: { bonus: 1, arrow: '↗', label: 'Good', color: '#9be15d' },
    2: { bonus: 3, arrow: '⬆', label: 'Excellent', color: '#2ee59d' },
}

const clampForm = (value) => Math.max(FORM_MIN, Math.min(FORM_MAX, Math.round(value || 0)))

// Phase 40: thẻ +10 luôn ở phong độ cao nhất (kể cả thẻ +10 của AI).
export const PEAK_UPGRADE = 10
export const isPeakCard = (player) => (player?.upgrade || 1) >= PEAK_UPGRADE

export const formOf = (player) => (isPeakCard(player) ? FORM_MAX : clampForm(player?.form ?? 0))

// Thẻ +10: ngoài trận luôn thể lực 100% và phong độ cao nhất (trong trận vẫn
// mệt dần như thường — xem systems/stamina.js).
export const settlePeakCard = (player) =>
    isPeakCard(player) && (player.condition !== 100 || player.form !== FORM_MAX)
        ? { ...player, condition: 100, form: FORM_MAX }
        : player
export const formInfo = (player) => FORM_LEVELS[formOf(player)]
export const formBonus = (player) => formInfo(player).bonus

const MAIN_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

// Cầu thủ đã cộng điểm phong độ (dùng cho engine / mô phỏng / OVR hiển thị).
export function withForm(player) {
    const bonus = player ? formBonus(player) : 0

    if (!bonus) return player

    const next = { ...player, formBonus: bonus, overall: (player.overall || 0) + bonus }

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

// OVR hiển thị có tính phong độ.
export const overallWithForm = (player) => (player?.overall || 0) + (player ? formBonus(player) : 0)

function hash(text) {
    let value = 2166136261

    for (let index = 0; index < text.length; index += 1) {
        value ^= text.charCodeAt(index)
        value = Math.imul(value, 16777619) >>> 0
    }

    return value
}

// Phong độ ngẫu nhiên (tất định theo hạt giống) cho cầu thủ AI:
// 10% ⬇, 20% ↘, 40% ➡, 20% ↗, 10% ⬆.
export function randomForm(seed) {
    const roll = (hash(String(seed)) % 1000) / 1000

    if (roll < 0.1) return -2
    if (roll < 0.3) return -1
    if (roll < 0.7) return 0
    if (roll < 0.9) return 1
    return 2
}

// Sau trận: ratings = [{ id, rating }] (hoặc Map id → rating), played =
// { id: tỉ lệ thời gian thi đấu }. Trả về { players, changes: [{ id, from, to }] }.
export function applyFormAfterMatch(players = [], ratings = [], played = {}, random = Math.random) {
    const ratingOf = ratings instanceof Map
        ? (id) => ratings.get(id)
        : (id) => ratings.find?.((entry) => entry.id === id)?.rating
    const changes = []

    const next = players.map((player) => {
        const from = formOf(player)
        const fraction = played[player.id] || 0
        const rating = ratingOf(player.id)
        let to = from

        if (fraction > 0 && typeof rating === 'number') {
            const roll = random()

            if (rating >= 7.5) to = roll < 0.65 ? from + 1 : roll < 0.95 ? from : from - 1
            else if (rating <= 5.5) to = roll < 0.65 ? from - 1 : roll < 0.95 ? from : from + 1
            else to = roll < 0.15 ? from + 1 : roll < 0.3 ? from - 1 : from
        } else if (from !== 0 && random() < 0.5) {
            // Không ra sân: dần về bình thường.
            to = from > 0 ? from - 1 : from + 1
        }

        to = clampForm(to)

        // Phase 40: thẻ +10 luôn phong độ cao nhất.
        if (isPeakCard(player)) return player.form === FORM_MAX ? player : { ...player, form: FORM_MAX }
        if (to === from) return player

        changes.push({ id: player.id, name: player.name, number: player.number, position: player.position, from, to })
        return { ...player, form: to }
    })

    return { players: next, changes }
}

// Thẻ Phong độ: cả đội lên mức cao nhất.
export const maxForm = (players = []) => players.map((player) => ({ ...player, form: FORM_MAX }))

// Áp dụng cho cả đội của người chơi trong roster (đá chính, dự bị, đội hình ngoài).
function mapBlueSquad(roster, update) {
    return roster.map((team) =>
        team.id !== 'blue'
            ? team
            : {
                ...team,
                players: (team.players || []).map(update),
                substitutes: (team.substitutes || []).map(update),
                reserves: (team.reserves || []).map(update),
            },
    )
}

// Thẻ Thể lực: cả đội thể lực 100.
export const restoreSquadFitness = (roster) => mapBlueSquad(roster, (player) => ({ ...player, condition: 100 }))

// Thẻ Phong độ: cả đội phong độ cao nhất.
export const maxSquadForm = (roster) => mapBlueSquad(roster, (player) => ({ ...player, form: FORM_MAX }))
