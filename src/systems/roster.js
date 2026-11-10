import { clamp } from './constants'
import { TEAMS } from '../data/teams'

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

export const ROSTER_STORAGE_KEY = 'ultimate-football-roster-save-v1'

export const RED_BASE_STRENGTH = 79

export const OPPONENT_COLORS = [
    // Tránh xanh lá (trùng màu cỏ) và xanh dương (trùng BLUE FC).
    '#ed4545', '#f28c28', '#8e44ad', '#f1c40f', '#e84393',
    '#f5f5f5', '#c0392b', '#d35400', '#7f8c8d', '#b33771',
    '#1e1e1e', '#ff6f61',
]

export function getOpponentColor(teamId) {
    if (teamId === 'red') return '#ed4545'
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

        // Đối thủ khác RED UNITED: mỗi đội một bộ tên riêng.
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
                players: Array.isArray(savedTeam.players)
                    ? migrateNames(savedTeam.players, defaults)
                    : [...defaultTeam.players],
                substitutes: Array.isArray(savedTeam.substitutes)
                    ? migrateNames(savedTeam.substitutes, defaults)
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
