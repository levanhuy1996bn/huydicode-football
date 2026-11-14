// Phase 29D: loạt sút luân lưu tự đá trong engine 3D.
//
// - Cả hai đội sút vào cùng một khung thành (phía −Z): trước mỗi quả, đội sút
//   được cho "tấn công" về −Z bằng cách đặt state.sidesSwapped (xanh tấn công
//   −Z khi không đổi sân, đỏ khi đổi sân). Nhờ vậy toàn bộ logic phạt đền sẵn có
//   (restartAtSpot 'penalty', thủ môn đoán hướng, cứu thua) dùng lại nguyên vẹn.
// - Cầu thủ hai đội đứng ở vòng tròn giữa sân; thủ môn không bắt đứng ở mép
//   vòng cấm.
// - Người chơi sút (D giữ lấy lực, ← / → ngắm) khi đến lượt đội mình; khi đối
//   thủ sút, ← / → chọn hướng bay người của thủ môn (↓ đứng giữa).
// - Bóng vào lưới → ghi bàn; bóng ra ngoài, thủ môn bắt / đẩy ra, bóng dừng
//   → hỏng. Không có bóng bật bồi.
// - Thống kê trận không bị cộng (state.shootout chặn ghi số liệu cú sút).
import { FIELD } from './constants'
import { getPlayer, updateCurl, updateWindup } from './ball'
import { restartAtSpot } from './rules'
import { updateCharge, updatePenaltyDive } from './control'
import { updateCarrierAI } from './carrierAI'
import { updateGoalkeeper } from './goalkeeper'
import { trackVelocities } from './movement'
import { clearPlayerStates, updatePlayerStates } from './playerState'
import { attr } from './attributes'
import { shootoutStatus } from './shootoutRules'

const SHOOT_END = -1 // khung thành phía −Z
const RESULT_PAUSE = 1.9
const FLIGHT_LIMIT = 3.2

const other = (team) => (team === 'blue' ? 'red' : 'blue')

// Thứ tự sút: dứt điểm + lực sút tốt nhất trước, thủ môn cuối cùng.
// Phase 42: người sút phạt đền đã chọn (SET PIECES) sút quả đầu tiên.
function takerOrder(ctx, teamId) {
    const chosen = ctx.setPieceTakers?.[teamId]?.penalty

    return ctx.players
        .filter((item) => item.teamId === teamId && ctx.objects[item.id])
        .sort((a, b) => {
            if (a.id === chosen) return -1
            if (b.id === chosen) return 1
            if (a.role === 'GK') return 1
            if (b.role === 'GK') return -1

            const score = (item) => attr(item, 'finishing') + attr(item, 'shotPower') * 0.3

            return score(b) - score(a)
        })
        .map((item) => item.id)
}

// Đứng chờ: cầu thủ ở vòng tròn giữa sân, quay mặt về khung thành.
function lineUp(ctx, kickingTeam) {
    const { objects } = ctx
    const facing = Math.atan2(0, SHOOT_END) // nhìn về −Z

    ;['blue', 'red'].forEach((teamId, teamIndex) => {
        const outfield = ctx.players.filter((item) => item.teamId === teamId && item.role !== 'GK' && objects[item.id])

        outfield.forEach((item, index) => {
            const object = objects[item.id]
            const x = (teamIndex === 0 ? -1 : 1) * (1.2 + index * 1.15)

            object.position.set(x, 0, 0.6 + (index % 2) * 0.9)
            object.rotation.y = facing
        })

        // Thủ môn không bắt: đứng ở mép vòng cấm.
        const keeper = ctx.players.find((item) => item.teamId === teamId && item.role === 'GK')

        if (keeper && objects[keeper.id] && teamId === kickingTeam) {
            objects[keeper.id].position.set(-22, 0, SHOOT_END * 37)
            objects[keeper.id].rotation.y = Math.PI / 2
        }
    })
}

function setupKick(ctx) {
    const { state } = ctx
    const shootout = state.shootout
    const status = shootoutStatus(shootout.kicks, shootout.first)
    // Phase 42: tập luyện — luôn một đội sút ('take' = bạn sút, 'save' = máy
    // sút, bạn bay người); người sút phạt đền đã chọn sút mọi quả.
    const team = shootout.training ? (shootout.training === 'take' ? 'blue' : 'red') : status.next

    if (!team) return

    const order = shootout.order[team]
    const fixed = shootout.training === 'take' ? ctx.setPieceTakers?.blue?.penalty : null
    const takerId = fixed && order.includes(fixed) ? fixed : order[shootout.index[team] % order.length]

    // Đội sút tấn công về −Z.
    state.sidesSwapped = team === 'red'
    state.penaltyKick = null
    state.userDive = null
    state.keeperPlans = {}
    state.keeperHands = null
    state.pickupLocks = {}
    state.curl = null
    state.charge = null
    state.windup = null

    lineUp(ctx, team)
    clearPlayerStates(state)
    restartAtSpot(ctx, team, 'penalty', 0, 0, { kickerId: takerId, silent: true })

    shootout.current = { team, takerId, takerName: getPlayer(ctx, takerId)?.name || '' }
    shootout.phase = 'waiting'
    shootout.timer = 0
    shootout.kickId = null

    ctx.onActionMessage(
        team === 'blue'
            ? `YOUR KICK · ${shootout.current.takerName.toUpperCase()} · ← / → AIM · HOLD D TO SHOOT`
            : `${ctx.opponentName} KICK · ${shootout.current.takerName.toUpperCase()} · HOLD ← / → TO DIVE`,
    )
    ctx.onShootoutUpdate?.({ ...snapshot(shootout) })
}

function snapshot(shootout) {
    return {
        kicks: shootout.kicks.map((kick) => ({ ...kick })),
        first: shootout.first,
        current: shootout.current ? { ...shootout.current } : null,
        phase: shootout.phase,
        status: shootoutStatus(shootout.kicks, shootout.first),
    }
}

export function startShootout(ctx, { first = 'blue', kicks = [], training = null } = {}) {
    const { state } = ctx

    state.whistle = null
    state.matchEnded = false
    state.restart = null
    state.pendingRestart = null
    state.possession = null
    state.autoPilot = false
    state.shootout = {
        first,
        kicks: [...kicks],
        order: { blue: takerOrder(ctx, 'blue'), red: takerOrder(ctx, 'red') },
        index: {
            blue: kicks.filter((kick) => kick.team === 'blue').length,
            red: kicks.filter((kick) => kick.team === 'red').length,
        },
        phase: 'setup',
        timer: 0,
        current: null,
        savedSides: state.sidesSwapped,
        training,
    }

    setupKick(ctx)
}

export function stopShootout(ctx) {
    const { state } = ctx

    if (!state.shootout) return

    state.sidesSwapped = state.shootout.savedSides
    state.shootout = null
    state.restart = null
    state.penaltyKick = null
}

function finishKick(ctx, scored) {
    const { state } = ctx
    const shootout = state.shootout
    const { team, takerId, takerName } = shootout.current

    shootout.kicks.push({ team, scored, takerId, takerName })
    shootout.index[team] += 1
    shootout.phase = 'result'
    shootout.timer = 0
    shootout.lastScored = scored

    // Phase 42: tập luyện — không bao giờ kết thúc, báo kết quả từng quả.
    if (shootout.training) {
        const userTook = shootout.training === 'take'

        ctx.onActionMessage(
            userTook
                ? scored ? `GOAL! ${takerName.toUpperCase()}` : 'MISSED / SAVED'
                : scored ? `${takerName.toUpperCase()} SCORES` : 'SAVED! GREAT DIVE',
        )
        ctx.onSound?.(scored ? 'pen-goal' : 'pen-miss', { user: userTook })
        ctx.onTrainingResult?.({ result: userTook ? (scored ? 'goal' : 'miss') : (scored ? 'conceded' : 'saved') })
        return
    }

    const status = shootoutStatus(shootout.kicks, shootout.first)

    ctx.onActionMessage(scored ? `GOAL! ${takerName.toUpperCase()} SCORES` : `MISSED! ${takerName.toUpperCase()}`)
    ctx.onSound?.(scored ? 'pen-goal' : 'pen-miss', { user: team === 'blue' })
    ctx.onShootoutUpdate?.({ ...snapshot(shootout) })

    if (status.done) {
        shootout.phase = 'done'
        ctx.onShootoutEnd?.({ kicks: shootout.kicks.map((kick) => ({ ...kick })), first: shootout.first, winner: status.winner })
    }
}

export function stepShootout(ctx, dt) {
    const { state } = ctx
    const shootout = state.shootout
    const ball = ctx.ballRef.current

    if (!shootout || !ball) return

    Object.keys(state.timers).forEach((key) => {
        state.timers[key] = Math.max(0, state.timers[key] - dt)
    })
    Object.keys(state.pickupLocks).forEach((id) => {
        state.pickupLocks[id] -= dt
        if (state.pickupLocks[id] <= 0) delete state.pickupLocks[id]
    })

    shootout.timer += dt

    if (shootout.phase === 'waiting') {
        updatePenaltyDive(ctx)
        updateCharge(ctx, dt)
        updateWindup(ctx, dt)
        updateCarrierAI(ctx, dt)

        // Bóng đã rời chân người sút.
        if (!state.restart && state.penaltyKick && state.penaltyKick.kickId === state.kickId) {
            shootout.phase = 'flight'
            shootout.timer = 0
            shootout.kickId = state.kickId
        }
    }

    if (shootout.phase === 'flight') {
        updateCurl(ctx, dt)
        updateGoalkeeper(ctx, other(shootout.current.team), {}, dt)

        const position = ball.translation()
        const velocity = ball.linvel()
        const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
        const defending = other(shootout.current.team)
        const keeper = ctx.players.find((item) => item.teamId === defending && item.role === 'GK')

        if (
            position.z * SHOOT_END > FIELD.lineZ &&
            Math.abs(position.x) <= FIELD.goalHalfWidth &&
            position.y < FIELD.goalHeight
        ) {
            finishKick(ctx, true)
        } else if (
            position.z * SHOOT_END > FIELD.lineZ + FIELD.ballRadius ||
            Math.abs(position.x) > FIELD.lineX ||
            (keeper && state.keeperHands === keeper.id) ||
            shootout.timer > FLIGHT_LIMIT ||
            (shootout.timer > 1 && speed < 1.2) ||
            // Bóng bị đẩy ngược ra xa khung thành.
            (shootout.timer > 0.4 && velocity.z * SHOOT_END < -3 && position.z * SHOOT_END < FIELD.lineZ - 14)
        ) {
            finishKick(ctx, false)
        }
    } else if (shootout.phase === 'result') {
        updateGoalkeeper(ctx, other(shootout.current.team), {}, dt)

        if (shootout.timer >= RESULT_PAUSE) setupKick(ctx)
    } else if (shootout.phase === 'done') {
        ball.setLinvel({ x: 0, y: Math.min(0, ball.linvel().y), z: 0 }, true)
    }

    trackVelocities(ctx, dt)
    updatePlayerStates(ctx, dt)

    const finalBall = ball.translation()
    state.ballPosition.x = finalBall.x
    state.ballPosition.y = finalBall.y
    state.ballPosition.z = finalBall.z
}
