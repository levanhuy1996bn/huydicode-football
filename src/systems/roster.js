import { clamp } from './constants'
import { TEAMS } from '../data/teams'

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

        if (/^Red /.test(next.name || '')) {
            next.name = `${opponent.shortName} ${next.position} ${next.number}`
        }

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

            return {
                ...defaultTeam,
                ...savedTeam,
                players: Array.isArray(savedTeam.players)
                    ? savedTeam.players
                    : [...defaultTeam.players],
                substitutes: Array.isArray(savedTeam.substitutes)
                    ? savedTeam.substitutes
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
