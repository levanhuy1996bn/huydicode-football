import { clamp } from './constants'
import { TEAMS } from '../data/teams'
import { LEAGUE_TEAMS } from '../data/leagueData'

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

export const RED_BASE_STRENGTH = 79

export const OPPONENT_COLORS = [
    // Tránh xanh lá (trùng màu cỏ) và đỏ (trùng áo Manchester United).
    '#2387ff', '#0d47a1', '#8e44ad', '#f1c40f', '#f5f5f5',
    '#1e1e1e', '#7f8c8d', '#00acc1', '#3949ab', '#5d4037',
    '#ff9800', '#ffeb3b',
]

export function getOpponentColor(teamId) {
    const leagueColor = LEAGUE_TEAMS.find((team) => team.id === teamId)?.color
    if (leagueColor) return leagueColor
    let hash = 0
    for (const char of String(teamId)) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    }
    return OPPONENT_COLORS[hash % OPPONENT_COLORS.length]
}

// Đội hình RED trong trận 3D được "đóng vai" đối thủ thật của vòng đấu:
// đổi tên, màu áo và quy đổi chỉ số theo strength của đội đó.
export function buildMatchRoster(roster, opponent) {
    if (!opponent || opponent.id === 'red') return roster

    const delta = (opponent.strength ?? RED_BASE_STRENGTH) - RED_BASE_STRENGTH
    const statKeys = [
        'overall', 'pace', 'shooting', 'passing',
        'dribbling', 'defending', 'physical',
    ]

    const mapPlayer = (player) => {
        const next = { ...player }

        statKeys.forEach((key) => {
            if (typeof next[key] === 'number') {
                next[key] = Math.round(clamp(next[key] + delta, 1, 99))
            }
        })

        // Đối thủ khác Manchester City: mỗi đội một bộ tên riêng.
        next.name = generatePlayerName(opponent.id, next.number)

        return next
    }

    return roster.map((team) => {
        if (team.id !== 'red') return team

        return {
            ...team,
            name: opponent.name,
            shortName: opponent.shortName,
            color: getOpponentColor(opponent.id),
            players: team.players.map(mapPlayer),
            substitutes: (team.substitutes || []).map(mapPlayer),
        }
    })
}

export function createInitialRoster() {
    return TEAMS.map((team) => ({
        ...team,
        players: [...team.players],
        substitutes: [...team.substitutes],
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
                return {
                    ...defaultTeam,
                    players: [...defaultTeam.players],
                    substitutes: [...defaultTeam.substitutes],
                }
            }

            const defaults = [...defaultTeam.players, ...defaultTeam.substitutes]

            return {
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
            }
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
