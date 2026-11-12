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
        // Phase 21
        passesCompleted: 0,
        xg: 0,
        // Phase 23: cú sút bị chặn bởi cầu thủ (không tính thủ môn)
        blocks: 0,
    })

    return {
        possession: { blue: 0, red: 0 },
        teams: { blue: team(), red: team() },
        players: {},
        lastPasserId: null,
        lastPassTeam: null,
        // Phase 21: đường chuyền đang bay (để biết chuyền thành công hay
        // không) và danh sách cú sút (bản đồ cú sút sau trận).
        openPass: null,
        shots: [],
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
            passesCompleted: 0,
            xg: 0,
            blocks: 0,
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
        passesCompleted: 0,
        xg: 0,
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

// ---- Phase 21: chuyền thành công, xG, bản đồ cú sút ----

// Bóng vừa rời chân trong một đường chuyền.
export function openPass(state, teamId, playerId) {
    if (!state.stats) return

    state.stats.openPass = { teamId, playerId, kickId: state.kickId }
}

// Có người khống chế bóng: đồng đội của người chuyền → chuyền thành công.
export function closePass(state, receiverTeamId) {
    const open = state.stats?.openPass

    if (!open) return

    if (open.kickId === state.kickId && open.teamId === receiverTeamId) {
        recordTeam(state, open.teamId, 'passesCompleted')
        recordPlayer(state, open.playerId, 'passesCompleted')
    }

    state.stats.openPass = null
}

// Bàn thắng kỳ vọng (xG) của một cú sút: theo góc nhìn khung thành (rộng
// 7.32m) từ vị trí sút. Hiệu chỉnh theo tỉ lệ ghi bàn thực tế của game (mô
// phỏng 24 trận: xG ≈ số bàn): ~0.26 từ 18m chính diện, ~0.45 từ 11m, ~0.8
// từ 6m; phạt đền 0.76; bị áp sát (< 2m) giảm 30%.
export function shotXg({ lateral, depth, penalty = false, freeKick = false, pressed = false }) {
    if (penalty) return 0.76

    const goalWidth = 7.32
    const half = goalWidth / 2
    const denominator = lateral * lateral + depth * depth - half * half
    let angle = Math.atan2(goalWidth * Math.max(0.1, depth), denominator)

    if (angle < 0) angle += Math.PI

    let xg = 1 / (1 + Math.exp(-(-2.45 + 3.54 * angle)))

    if (freeKick) xg = Math.min(xg, 0.07)
    if (pressed) xg *= 0.7

    return clamp(xg, 0.01, 0.95)
}

// ---- Phase 29C: cú sút bồi / bóng bật ----
// Cú sút trong vòng REBOUND_WINDOW giây sau một cú sút không thành bàn của
// cùng đội (bị cứu, bị chặn, dội ra) là cú sút bồi: xG ×1.2 (thủ môn / hậu vệ
// thường chưa kịp về vị trí), gắn nhãn REBOUND trên bản đồ cú sút.
export const REBOUND_WINDOW = 4
export const REBOUND_XG_FACTOR = 1.2
// Bóng chạm cầu thủ đội phòng ngự rồi vào lưới trong DEFLECTION_WINDOW giây
// sau cú sút → bàn của người sút (bóng đổi hướng), không phải phản lưới.
export const DEFLECTION_WINDOW = 2.5

const nowOf = (state) => state.elapsed || 0

// Cú sút gần nhất (chưa thành bàn) của một đội trong `window` giây.
export function recentShot(state, teamId, window = REBOUND_WINDOW) {
    const shots = state.stats?.shots

    if (!shots?.length) return null

    for (let index = shots.length - 1; index >= 0; index -= 1) {
        const shot = shots[index]

        if (nowOf(state) - (shot.at ?? -Infinity) > window) return null
        if (shot.teamId === teamId) return shot.goal ? null : shot
    }

    return null
}

export function recordShot(state, entry) {
    if (!state.stats) return null

    const rebound = entry.rebound ?? (!entry.penalty && Boolean(recentShot(state, entry.teamId)))
    const xg = rebound ? clamp(entry.xg * REBOUND_XG_FACTOR, 0.01, 0.95) : entry.xg
    const shot = { ...entry, xg, rebound, at: nowOf(state), goal: false }

    state.stats.shots.push(shot)
    recordTeam(state, entry.teamId, 'xg', xg)
    recordPlayer(state, entry.playerId, 'xg', xg)
    return shot
}

// Đánh dấu cú sút gần nhất của người ghi bàn là bàn thắng. Trả về cú sút đó
// (null nếu không có — bàn thắng từ một lần chạm / bóng bật, xem creditGoal).
export function markShotGoal(state, scorerId) {
    const shots = state.stats?.shots

    if (!shots || !scorerId) return null

    for (let index = shots.length - 1; index >= Math.max(0, shots.length - 4); index -= 1) {
        const shot = shots[index]

        if (shot.playerId === scorerId && !shot.goal && nowOf(state) - (shot.at ?? nowOf(state)) <= REBOUND_WINDOW + 4) {
            shot.goal = true
            return shot
        }
    }

    return null
}

// Bàn thắng không có cú sút đi kèm (đá bồi bằng một lần chạm, bóng bật vào
// người rồi vào lưới, chuyền / đỡ bóng thành bàn): ghi thành một cú sút tại
// vị trí người ghi bàn, có xG, rồi đánh dấu là bàn thắng.
export function recordTouchGoal(state, { teamId, playerId, lateral, depth }) {
    if (!state.stats) return null

    recordTeam(state, teamId, 'shots')
    recordPlayer(state, playerId, 'shots')

    const shot = recordShot(state, {
        teamId,
        playerId,
        depth,
        lateral,
        variant: null,
        touch: true,
        xg: shotXg({ lateral, depth }),
    })

    if (shot) shot.goal = true
    return shot
}

// Tỉ lệ chuyền thành công (%) của một đội.
export function passAccuracy(team) {
    if (!team?.passes) return 0

    return Math.round(((team.passesCompleted || 0) / team.passes) * 100)
}
