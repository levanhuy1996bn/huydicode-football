import { TEAMS } from '../data/teams'
import { worldClub } from '../data/world'
import { BENCH_COUNT, STARTER_COUNT, worldSquad } from '../data/worldSquads'
import { nationalSquad } from '../services/nationalTeams'
import { applyUpgradeLevel } from '../services/upgrade'
import { aiUpgradeFor, difficultyOf } from '../services/difficulty'
import { ensureCardFields, playerIdOf } from '../services/cards'
import { randomForm, settlePeakCard } from './form'

// Tên mặc định cũ ("Blue ST 9", "Red CB 4") trong bản lưu cũ.
const GENERIC_NAME = /^(Blue|Red) [A-Z]{2,3} \d+$/

// Kho tên để đặt tên cho đội hình các đối thủ khác trong giải (tất định
// theo id đội + số áo, nên mỗi đội luôn có cùng một bộ tên).
const FIRST_NAMES = [
    'Adam', 'Leon', 'Oliver', 'Jonas', 'Mason', 'Victor', 'Felix', 'Ryan',
    'Owen', 'Callum', 'Theo', 'Nathan', 'Jamie', 'Elias', 'Isaac', 'Tomas',
    'Andre', 'Dylan', 'Rafael', 'Kevin', 'Sean', 'Milan', 'Luca', 'Ivan',
    'Marco', 'Emil', 'Joel', 'Arthur', 'Caleb', 'Hassan',
]

const LAST_NAMES = [
    'Carter', 'Holloway', 'Brennan', 'Okonkwo', 'Lindqvist', 'Moreau',
    'Kowalski', 'Hargreaves', 'Duarte', 'Novak', 'Achterberg', 'Sullivan',
    'Bianchi', 'Thornton', 'Petrovic', 'Garrido', 'Fairweather', 'Kingsley',
    'Abernathy', 'Vasquez', 'Lambert', 'Osei', 'Fischer', 'Doherty',
    'Marchetti', 'Whitfield', 'Andersen', 'Delgado', 'Rutherford', 'Yilmaz',
    'Castellanos', 'Brightwell', 'Mbeki', 'Ostrowski', 'Galloway', 'Haddad',
]

function hashString(value) {
    let hash = 2166136261

    for (const char of String(value)) {
        hash ^= char.charCodeAt(0)
        hash = Math.imul(hash, 16777619) >>> 0
    }

    return hash
}

export function generatePlayerName(teamId, number) {
    const seed = hashString(`${teamId}:${number}`)

    return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[(seed >>> 7) % LAST_NAMES.length]}`
}

// Bản lưu cũ còn tên mặc định → thay bằng tên mới theo id cầu thủ.
function migrateNames(players, defaults) {
    const defaultById = new Map(defaults.map((player) => [player.id, player]))

    return players.map((player) =>
        GENERIC_NAME.test(player.name || '') && defaultById.get(player.id)
            ? { ...player, name: defaultById.get(player.id).name }
            : player,
    )
}

// Phase 19: bản lưu cũ có 6 chỉ số "phẳng" (≈ overall, không theo vị trí).
// Cầu thủ mặc định (id có trong đội hình gốc) được cập nhật chỉ số chính
// theo vị trí; cầu thủ mua từ thị trường giữ nguyên chỉ số của mình.
const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

function looksFlat(player) {
    const values = STAT_KEYS.map((key) => player[key]).filter((value) => typeof value === 'number')

    if (values.length < STAT_KEYS.length) return false

    return Math.max(...values) - Math.min(...values) <= 9
}

function migrateStats(players, defaults) {
    const defaultById = new Map(defaults.map((player) => [player.id, player]))

    return players.map((player) => {
        const fallback = defaultById.get(player.id)

        if (!fallback || !looksFlat(player)) return player

        const next = { ...player }

        STAT_KEYS.forEach((key) => {
            next[key] = fallback[key]
        })

        return next
    })
}

// v2: đổi đội người chơi sang Manchester United (đội hình khác) → bản lưu cũ bỏ qua.
export const ROSTER_STORAGE_KEY = 'ultimate-football-roster-save-v2'

// ---- Phase 22: quy tắc đội hình ----
// 11 đá chính (players) + tối đa 9 dự bị (substitutes, băng ghế trong trận)
// + đội hình ngoài (reserves, không vào sân). Tổng tối đa 50 cầu thủ.
// Cầu thủ đá chính và dự bị không bán được; chỉ bán cầu thủ ở đội hình ngoài.
export const SQUAD_LIMITS = { starters: 11, bench: 9, total: 50 }

export function squadOf(team) {
    if (!team) return []

    return [
        ...(team.players || []),
        ...(team.substitutes || []),
        ...(team.reserves || []),
    ]
}

export function squadGroupOf(team, playerId) {
    if (team?.players?.some((player) => player.id === playerId)) return 'starter'
    if (team?.substitutes?.some((player) => player.id === playerId)) return 'bench'
    if (team?.reserves?.some((player) => player.id === playerId)) return 'reserve'

    return null
}

// Save cũ: băng ghế không giới hạn, chưa có đội hình ngoài → dư ra bao nhiêu
// người dự bị (từ người thứ 10) thì chuyển ra đội hình ngoài.
export function normalizeSquad(team) {
    const substitutes = [...(team.substitutes || [])]
    const reserves = [...(team.reserves || [])]
    const overflow = substitutes.splice(SQUAD_LIMITS.bench)

    // Phase 23: mọi cầu thủ là một thẻ (playerId / cardId / upgrade / rarity).
    return {
        ...team,
        // Phase 40: thẻ +10 trong bản lưu cũ → thể lực 100%, phong độ cao nhất.
        players: (team.players || []).map((player) => settlePeakCard(ensureCardFields(player))),
        substitutes: substitutes.map((player) => settlePeakCard(ensureCardFields(player))),
        reserves: [...overflow, ...reserves].map((player) => settlePeakCard(ensureCardFields(player))),
    }
}

// Phase 23: trong 20 người đá chính + dự bị không được có 2 thẻ cùng một
// cầu thủ (playerId). Trả về thẻ đang gây trùng (nếu có) khi đưa `incoming`
// vào đội hình thi đấu, bỏ qua các thẻ trong `leavingIds` (người rời đi).
export function matchdayConflict(team, incoming, leavingIds = []) {
    const target = playerIdOf(incoming)

    return [...(team?.players || []), ...(team?.substitutes || [])].find(
        (player) =>
            player.id !== incoming.id &&
            !leavingIds.includes(player.id) &&
            playerIdOf(player) === target,
    ) || null
}

export const OPPONENT_COLORS = [
    // Tránh xanh lá (trùng màu cỏ) và đỏ (trùng áo Manchester United).
    '#2387ff', '#0d47a1', '#8e44ad', '#f1c40f', '#f5f5f5',
    '#1e1e1e', '#7f8c8d', '#00acc1', '#3949ab', '#5d4037',
    '#ff9800', '#ffeb3b',
]

export function getOpponentColor(teamId) {
    const clubColor = worldClub(teamId)?.color
    if (clubColor) return clubColor
    let hash = 0
    for (const char of String(teamId)) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    }
    return OPPONENT_COLORS[hash % OPPONENT_COLORS.length]
}

// Phase 26A: đội RED trong trận 3D "đóng vai" CLB thật của vòng đấu: dùng
// đúng đội hình 22 người tất định của CLB đó (data/worldSquads.js): 11 người
// đầu vào 11 ô sơ đồ của đội RED (giữ toạ độ ô), 9 người kế tiếp ngồi dự bị.
//
// Phase 26C: { difficulty, season } → mỗi cầu thủ đối thủ thành thẻ +N theo độ
// khó (applyUpgradeLevel cộng điểm như thẻ người chơi), đội có aiSpeed (AI
// quyết định nhanh / chậm hơn). Không truyền difficulty = thẻ +1 như cũ.
// Phase 29I: formSeed (id trận) → phong độ ngẫu nhiên cố định cho cầu thủ AI.
export function buildMatchRoster(roster, opponent, { difficulty = null, season = 0, formSeed = null } = {}) {
    if (!opponent || opponent.id === 'red') return roster

    // Phase 29E: đối thủ là đội tuyển quốc gia → 22 người được gọi lên tuyển.
    const squad = opponent.isNation ? nationalSquad(opponent.id) : worldSquad(opponent.id)

    if (!squad.length) return roster

    const boost = (player) =>
        difficulty ? applyUpgradeLevel(player, aiUpgradeFor(difficulty, player.playerId, season)) : player

    const toMatchPlayer = (template, player) => boost({
        ...template,
        id: player.id,
        playerId: player.playerId,
        cardId: player.id,
        name: player.name,
        position: player.position,
        number: player.number,
        overall: player.overall,
        pace: player.pace,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defending: player.defending,
        physical: player.physical,
        age: player.age,
        upgrade: 1,
        rarity: player.rarity,
        height: player.height,
        weight: player.weight,
        clubId: player.clubId,
        // Phase 29E: quốc tịch → team color quốc tịch của đội AI.
        nationality: player.nationality || null,
        condition: 100,
        form: formSeed ? randomForm(`${formSeed}:${player.id}`) : 0,
    })

    return roster.map((team) => {
        if (team.id !== 'red') return team

        const starters = squad.slice(0, STARTER_COUNT)
        const bench = squad.slice(STARTER_COUNT, STARTER_COUNT + BENCH_COUNT)
        const benchTemplate = team.substitutes?.[0] || team.players[0]

        return {
            ...team,
            name: opponent.name,
            shortName: opponent.shortName,
            color: getOpponentColor(opponent.id),
            difficulty: difficulty || null,
            aiSpeed: difficulty ? difficultyOf(difficulty).aiSpeed : 1,
            players: team.players.map((slot, index) =>
                toMatchPlayer(slot, starters[index] || starters[starters.length - 1]),
            ),
            substitutes: bench.map((player, index) =>
                toMatchPlayer({ ...benchTemplate, x: -28 + index * 7, z: -48 }, player),
            ),
            reserves: [],
        }
    })
}

export function createInitialRoster() {
    return TEAMS.map((team) => normalizeSquad({
        ...team,
        players: [...team.players],
        substitutes: [...team.substitutes],
        reserves: [...(team.reserves || [])],
    }))
}

export function loadSavedRoster() {
    if (typeof window === 'undefined') {
        return createInitialRoster()
    }

    try {
        const saved = localStorage.getItem(ROSTER_STORAGE_KEY)

        if (!saved) {
            return createInitialRoster()
        }

        const parsed = JSON.parse(saved)

        if (!Array.isArray(parsed)) {
            return createInitialRoster()
        }

        return TEAMS.map((defaultTeam) => {
            const savedTeam = parsed.find(
                (team) => team.id === defaultTeam.id,
            )

            if (!savedTeam) {
                return normalizeSquad({
                    ...defaultTeam,
                    players: [...defaultTeam.players],
                    substitutes: [...defaultTeam.substitutes],
                    reserves: [],
                })
            }

            const defaults = [...defaultTeam.players, ...defaultTeam.substitutes]

            return normalizeSquad({
                ...defaultTeam,
                ...savedTeam,
                // Tên / màu áo luôn lấy theo dữ liệu đội hiện tại.
                name: defaultTeam.name,
                shortName: defaultTeam.shortName,
                color: defaultTeam.color,
                players: Array.isArray(savedTeam.players)
                    ? migrateStats(migrateNames(savedTeam.players, defaults), defaults)
                    : [...defaultTeam.players],
                substitutes: Array.isArray(savedTeam.substitutes)
                    ? migrateStats(migrateNames(savedTeam.substitutes, defaults), defaults)
                    : [...defaultTeam.substitutes],
                reserves: Array.isArray(savedTeam.reserves)
                    ? migrateStats(migrateNames(savedTeam.reserves, defaults), defaults)
                    : [],
            })
        })
    } catch (error) {
        console.error('Unable to load saved roster:', error)
        return createInitialRoster()
    }
}

export function getRole(player) {
    const position = String(player.position || '').toUpperCase()

    if (position === 'GK' || position.includes('GOALKEEPER')) {
        return 'GK'
    }

    if (
        ['ST', 'FW', 'LW', 'RW', 'CF'].includes(position) ||
        position.includes('WING') ||
        position.includes('FORWARD')
    ) {
        return 'FW'
    }

    if (
        ['CM', 'CDM', 'CAM', 'AM', 'MF', 'LM', 'RM'].includes(position) ||
        position.includes('MID')
    ) {
        return 'MF'
    }

    if (
        ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(position) ||
        position.includes('BACK')
    ) {
        return 'DF'
    }

    if (player.number === 1) return 'GK'
    if ([2, 3, 4, 5].includes(player.number)) return 'DF'
    if ([6, 8, 10].includes(player.number)) return 'MF'

    return 'FW'
}

export function getPositionGroup(position) {
    const value = String(position || '').toUpperCase()

    if (value === 'GK') return 'GK'

    if (
        ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(value)
    ) {
        return 'DF'
    }

    if (
        ['CM', 'CDM', 'CAM', 'AM', 'MF', 'LM', 'RM'].includes(value)
    ) {
        return 'MF'
    }

    return 'FW'
}

// ---- Đổi sơ đồ: xếp người vào ô hợp nhất ----
// Trước đây cầu thủ thứ i nhận ô thứ i của sơ đồ mới, nên khi đổi 4 hậu vệ
// sang 3 hậu vệ, hậu vệ phải có thể bị đẩy lên làm tiền vệ cánh. Giờ mỗi ô
// (thủ môn → hậu vệ → tiền vệ → tiền đạo, ô biên trước) chọn người hợp nhất theo
// VỊ TRÍ SỞ TRƯỜNG (naturalPosition — vị trí gốc của thẻ, giữ lại dù đã bị
// xếp đá vị trí khác), rồi theo chỗ đang đứng. Trả về đội hình theo thứ tự ô.
const SLOT_GROUP = (position) => {
    const value = String(position || '').toUpperCase()

    if (value === 'GK') return 0
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(value)) return 1
    if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'AM'].includes(value)) return 2

    return 3
}

// Toạ độ "tự nhiên" của từng vị trí (đội mình, tấn công về z âm).
const NATURAL_SPOT = {
    GK: [0, 46], CB: [0, 35], LB: [-23, 32], RB: [23, 32], LWB: [-25, 18], RWB: [25, 18],
    CDM: [0, 16], CM: [0, 8], CAM: [0, -9], AM: [0, -9], LM: [-22, 6], RM: [22, 6],
    LW: [-21, -22], RW: [21, -22], ST: [0, -28], CF: [0, -14],
}

export const naturalPositionOf = (player) => player?.naturalPosition || player?.position

// ---- Sau Phase 27: đá trái vị trí → OVR HIỂN THỊ giảm ----
// Chỉ là con số hiển thị (bảng đội hình, trước trận, hồ sơ trong trận); chỉ
// số thật không đổi — tiền đạo đá trung vệ vẫn tắc bóng bằng chỉ số phòng
// ngự (thấp) của mình nên tự nhiên đá kém. Mức giảm: rất gần −2, gần −5,
// xa −10, rất xa −15.
const PAIR_PENALTY = {}
const pairKey = (a, b) => [a, b].sort().join('|')
const setPairs = (penalty, pairs) => pairs.forEach(([a, b]) => { PAIR_PENALTY[pairKey(a, b)] = penalty })

setPairs(2, [
    ['CM', 'CDM'], ['CM', 'CAM'], ['LB', 'LWB'], ['RB', 'RWB'], ['LW', 'LM'], ['RW', 'RM'],
    ['ST', 'CF'], ['CAM', 'CF'],
])
setPairs(5, [
    ['CDM', 'CB'], ['LB', 'RB'], ['LWB', 'RWB'], ['LW', 'RW'], ['LM', 'RM'], ['CAM', 'ST'],
    ['CM', 'LM'], ['CM', 'RM'], ['CDM', 'CAM'], ['CB', 'LB'], ['CB', 'RB'], ['LWB', 'LM'],
    ['RWB', 'RM'], ['LW', 'ST'], ['RW', 'ST'], ['CAM', 'LW'], ['CAM', 'RW'], ['CF', 'LW'],
    ['CF', 'RW'], ['LM', 'LB'], ['RM', 'RB'], ['LWB', 'LW'], ['RWB', 'RW'],
])
setPairs(10, [['LW', 'LB'], ['RW', 'RB'], ['CB', 'LWB'], ['CB', 'RWB']])

// Tuyến: hậu vệ 0, tiền vệ phòng ngự 1, tiền vệ 2, tiền vệ công 3, tiền đạo 4.
const LINE = {
    CB: 0, LB: 0, RB: 0, LWB: 0, RWB: 0, CDM: 1, CM: 2, LM: 2, RM: 2, AM: 3, CAM: 3,
    CF: 4, LW: 4, RW: 4, ST: 4,
}

export function positionPenalty(natural, played) {
    const a = String(natural || '').toUpperCase()
    const b = String(played || '').toUpperCase()

    if (!a || !b || a === b) return 0
    if (a === 'GK' || b === 'GK') return 15

    const listed = PAIR_PENALTY[pairKey(a, b)]

    if (listed) return listed

    const gap = Math.abs((LINE[a] ?? 2) - (LINE[b] ?? 2))

    return gap >= 4 ? 15 : 10
}

// OVR hiển thị ở vị trí đang đá (không bao giờ dưới 1).
export const positionOverall = (player) =>
    Math.max(1, (player?.overall || 0) - positionPenalty(naturalPositionOf(player), player?.position))

// Đặt cầu thủ vào một ô (vị trí + toạ độ), nhớ vị trí sở trường.
export const placeInSlot = (player, position, x, z) => ({
    ...player,
    naturalPosition: naturalPositionOf(player),
    position,
    x,
    z,
})

// Bài toán gán tối ưu (thuật toán Hungary, n × n): tổng "độ lệch vị trí" nhỏ
// nhất cho cả đội — không tham lam từng ô, nên khi thiếu người một tuyến thì
// người phù hợp nhất (vd. tiền vệ trung tâm xuống đá trung vệ) được chọn.
function solveAssignment(cost) {
    const n = cost.length
    const u = new Array(n + 1).fill(0)
    const v = new Array(n + 1).fill(0)
    const p = new Array(n + 1).fill(0)
    const way = new Array(n + 1).fill(0)

    for (let i = 1; i <= n; i += 1) {
        p[0] = i
        let j0 = 0
        const minv = new Array(n + 1).fill(Infinity)
        const used = new Array(n + 1).fill(false)

        do {
            used[j0] = true
            const i0 = p[j0]
            let delta = Infinity
            let j1 = 0

            for (let j = 1; j <= n; j += 1) {
                if (used[j]) continue

                const current = cost[i0 - 1][j - 1] - u[i0] - v[j]

                if (current < minv[j]) {
                    minv[j] = current
                    way[j] = j0
                }

                if (minv[j] < delta) {
                    delta = minv[j]
                    j1 = j
                }
            }

            for (let j = 0; j <= n; j += 1) {
                if (used[j]) {
                    u[p[j]] += delta
                    v[j] -= delta
                } else {
                    minv[j] -= delta
                }
            }

            j0 = j1
        } while (p[j0] !== 0)

        do {
            const j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1
        } while (j0)
    }

    // result[row] = column
    const result = new Array(n)

    for (let j = 1; j <= n; j += 1) result[p[j] - 1] = j - 1

    return result
}

function slotCost(player, [position, x, z]) {
    const natural = String(naturalPositionOf(player) || '').toUpperCase()
    const [nx, nz] = NATURAL_SPOT[natural] || [player.x ?? 0, player.z ?? 0]
    // Thủ môn chỉ vào ô thủ môn. Còn lại: mức giảm OVR khi đá trái vị trí là
    // chính, khoảng cách tới chỗ sở trường / chỗ đang đứng để phân định.
    if ((position === 'GK') !== (natural === 'GK')) return 10000

    return positionPenalty(natural, position) * 8 + Math.abs(nx - x) * 0.3 + Math.abs(nz - z) * 0.2 + Math.abs((player.x ?? 0) - x) * 0.1
}

export function assignFormation(players, formation) {
    const size = Math.min(players.length, formation.length)

    if (!size) return players

    const starters = players.slice(0, size)
    const slots = formation.slice(0, size)
    const matrix = starters.map((player) => slots.map((slot) => slotCost(player, slot)))
    const columnOf = solveAssignment(matrix)
    const placed = new Array(size)

    starters.forEach((player, row) => {
        const [position, x, z] = slots[columnOf[row]]

        placed[columnOf[row]] = placeInSlot(player, position, x, z)
    })

    return [...placed, ...players.slice(size)]
}
