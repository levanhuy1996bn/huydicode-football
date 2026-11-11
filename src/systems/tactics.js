import { TACTICS } from './constants'
import { getPlayer } from './ball'

// ---- Phase 18: chiến thuật theo từng đội ----
//
// - Đội người chơi (blue) dùng chiến thuật chọn trong giao diện (ctx.tactic).
// - Đối thủ (red) tự chọn chiến thuật theo tương quan lực lượng, tỉ số và
//   thời gian còn lại (state.aiTacticKey), xem updateOpponentTactic.
// - ctx.tactics = { blue, red } (nếu có) ghi đè cả hai — dùng cho mô phỏng.

export function teamTactic(ctx, teamId) {
    if (ctx.tactics?.[teamId]) return ctx.tactics[teamId]
    if (teamId === 'blue') return ctx.tactic || TACTICS.balanced

    return TACTICS[ctx.state.aiTacticKey] || TACTICS.balanced
}

const averageOverall = (players) => {
    const outfield = players.filter((item) => item.role !== 'GK')

    if (outfield.length === 0) return 75

    return outfield.reduce((sum, item) => sum + (item.overall || 75), 0) / outfield.length
}

// Chiến thuật đối thủ muốn dùng lúc này.
export function pickOpponentTactic(ctx) {
    const { state } = ctx
    const duration = ctx.matchDuration || 360
    const progress = Math.min(1, (state.elapsed || 0) / duration)
    const lead = (state.score?.red || 0) - (state.score?.blue || 0)
    const edge = averageOverall(ctx.redPlayers) - averageOverall(ctx.bluePlayers)

    // Đang thua: càng về cuối càng dồn lên.
    if (lead < 0) {
        if (progress > 0.8) return 'highPress'
        if (progress > 0.5 || lead <= -2) return 'attacking'
    }

    // Đang dẫn: giữ kết quả.
    if (lead > 0) {
        if (progress > 0.75) return 'defensive'
        if (lead >= 2 || progress > 0.5) return 'counter'
    }

    // Thế trận ban đầu theo tương quan lực lượng.
    if (edge >= 2.5) return 'highPress'
    if (edge <= -2.5) return 'counter'

    return 'balanced'
}

const REVIEW_INTERVAL = 8

// Gọi mỗi bước logic: đối thủ xem lại chiến thuật mỗi 8 giây.
export function updateOpponentTactic(ctx, dt) {
    const { state } = ctx

    if (ctx.tactics?.red) return

    state.aiTacticTimer = (state.aiTacticTimer ?? 0) - dt

    if (state.aiTacticTimer > 0) return

    state.aiTacticTimer = REVIEW_INTERVAL

    const next = pickOpponentTactic(ctx)

    if (next === state.aiTacticKey) return

    const first = !state.aiTacticKey

    state.aiTacticKey = next

    // Không báo ở lần chọn đầu tiên (đầu trận).
    if (!first || next !== 'balanced') {
        ctx.onActionMessage(
            `${ctx.opponentName} TACTIC: ${TACTICS[next].label.toUpperCase()}`,
        )
    }
}

// Theo dõi quyền kiểm soát bóng: thời gian cầm bóng của người hiện tại và
// thời điểm một đội vừa mất bóng (để vây ráp ngay sau khi mất bóng).
export function trackPossession(ctx, snapshot, dt) {
    const { state } = ctx
    const ownerId = snapshot.ownerId
    const team = snapshot.ownerItem?.teamId || null

    state.elapsed = (state.elapsed || 0) + dt

    if (!state.carry || state.carry.id !== ownerId) {
        state.carry = { id: ownerId, time: 0, decideIn: 0, dirX: 0, dirZ: 0 }
    } else {
        state.carry.time += dt
    }

    if (state.turnover) state.turnover.time += dt

    if (team && team !== state.possessionTeam) {
        if (state.possessionTeam) {
            // Đội cũ vừa mất bóng.
            state.turnover = { team: state.possessionTeam, time: 0 }
        }

        state.possessionTeam = team
    }
}

// Đội này vừa mất bóng và còn trong thời gian vây ráp?
export function isCounterPressing(ctx, teamId) {
    const { state } = ctx
    const window = teamTactic(ctx, teamId).counterPress || 0

    return (
        window > 0 &&
        state.turnover?.team === teamId &&
        state.turnover.time < window
    )
}

export function tacticOfPlayer(ctx, playerId) {
    const item = getPlayer(ctx, playerId)

    return teamTactic(ctx, item?.teamId || 'blue')
}
