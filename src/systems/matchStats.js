import { clamp } from './constants'

// Thống kê trận đấu, ghi trong state.stats bởi các system của engine.
export function createMatchStats() {
    const team = () => ({
        shots: 0,
        onTarget: 0,
        passes: 0,
        tackles: 0,
        saves: 0,
        interceptions: 0,
        duels: 0,
        fouls: 0,
        yellow: 0,
        red: 0,
        offsides: 0,
        corners: 0,
    })

    return {
        possession: { blue: 0, red: 0 },
        teams: { blue: team(), red: team() },
        players: {},
        lastPasserId: null,
        lastPassTeam: null,
    }
}

function playerEntry(stats, playerId) {
    if (!stats.players[playerId]) {
        stats.players[playerId] = {
            goals: 0,
            assists: 0,
            shots: 0,
            passes: 0,
            tackles: 0,
            saves: 0,
            interceptions: 0,
            duels: 0,
            fouls: 0,
        }
    }

    return stats.players[playerId]
}

export function recordTeam(state, teamId, key, amount = 1) {
    const team = state.stats?.teams?.[teamId]

    if (team && key in team) team[key] += amount
}

export function recordPlayer(state, playerId, key, amount = 1) {
    if (!state.stats || !playerId) return

    playerEntry(state.stats, playerId)[key] += amount
}

export function recordPossession(state, teamId, dt) {
    if (state.stats && teamId && teamId in state.stats.possession) {
        state.stats.possession[teamId] += dt
    }
}

// ---- Tổng kết sau trận ----

const RATING_ROLE = (position) => {
    const value = String(position || '').toUpperCase()

    if (value === 'GK') return 'GK'
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(value)) return 'DF'
    if (['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(value)) return 'MF'

    return 'FW'
}

// Điểm cầu thủ 4.0–10.0: nền 6.0 + đóng góp + kết quả trận.
export function ratePlayer(player, line, { goalsFor, goalsAgainst }) {
    const role = RATING_ROLE(player.position)
    const result = goalsFor > goalsAgainst ? 0.5 : goalsFor < goalsAgainst ? -0.3 : 0.1

    let rating = 6 + result
    rating += line.goals * 1.1
    rating += line.assists * 0.7
    rating += Math.min(line.shots, 6) * 0.08
    rating += Math.min(line.passes, 30) * 0.025
    rating += line.tackles * (role === 'DF' || role === 'MF' ? 0.3 : 0.2)
    rating += line.saves * 0.35
    rating += (line.interceptions || 0) * 0.25
    rating += Math.min(line.duels || 0, 6) * 0.1

    if (role === 'GK' || role === 'DF') {
        rating += goalsAgainst === 0 ? 0.6 : -Math.min(goalsAgainst, 4) * 0.25
    }

    return Math.round(clamp(rating, 4, 10) * 10) / 10
}

export function buildMatchSummary({
    stats,
    players,
    subbedOffPlayers = [],
    blueScore,
    redScore,
    goalEvents,
    forfeit,
}) {
    const totalPossession =
        (stats?.possession.blue || 0) + (stats?.possession.red || 0)

    const bluePossession = totalPossession > 0
        ? Math.round(((stats.possession.blue || 0) / totalPossession) * 100)
        : 50

    const lineFor = (id) => ({
        goals: 0,
        assists: 0,
        shots: 0,
        passes: 0,
        tackles: 0,
        saves: 0,
        interceptions: 0,
        duels: 0,
        ...(stats?.players?.[id] || {}),
    })

    const ratings = [...players, ...subbedOffPlayers]
        .map((player) => {
            const line = lineFor(player.id)

            return {
                id: player.id,
                name: player.name,
                number: player.number,
                position: player.position,
                ...line,
                rating: forfeit
                    ? null
                    : ratePlayer(player, line, {
                        goalsFor: blueScore,
                        goalsAgainst: redScore,
                    }),
            }
        })
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

    const blueTeam = stats?.teams?.blue || {}
    const redTeam = stats?.teams?.red || {}

    return {
        forfeit,
        blueScore,
        redScore,
        goalEvents,
        possession: { blue: bluePossession, red: 100 - bluePossession },
        teams: { blue: blueTeam, red: redTeam },
        ratings,
        manOfTheMatch: forfeit ? null : ratings[0] || null,
    }
}
