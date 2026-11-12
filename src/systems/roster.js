import { TEAMS } from '../data/teams'
import { worldClub } from '../data/world'
import { BENCH_COUNT, STARTER_COUNT, worldSquad } from '../data/worldSquads'
import { applyUpgradeLevel } from '../services/upgrade'
import { aiUpgradeFor, difficultyOf } from '../services/difficulty'
import { ensureCardFields, playerIdOf } from '../services/cards'

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
        players: (team.players || []).map(ensureCardFields),
        substitutes: substitutes.map(ensureCardFields),
        reserves: [...overflow, ...reserves].map(ensureCardFields),
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
export function buildMatchRoster(roster, opponent, { difficulty = null, season = 0 } = {}) {
    if (!opponent || opponent.id === 'red') return roster

    const squad = worldSquad(opponent.id)

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
        condition: 100,
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
