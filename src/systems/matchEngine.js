import { getPlayer, updateCurl, updateDribble, updateLooseBallPickup, updateShotBlock, updateWindup } from './ball'
import { checkGoalAndOut, enforceRestartSpacing, restartAtSpot } from './rules'
import { updateWallBlock } from './referee'
import { updateCharge, updateControlledPlayer } from './control'
import { updateAISteal, updateAiSlides, updateReceiverRun, updateTeamAI } from './teamAI'
import { updateCarrierAI } from './carrierAI'
import { trackPossession, updateOpponentTactic } from './tactics'
import { updateGoalkeeper } from './goalkeeper'
import { resolvePlayerCollisions, trackVelocities } from './movement'
import { updatePlayerStates } from './playerState'
import { recordPossession } from './matchStats'
import { updateDuels, updateShield } from './duels'
import { updateStamina } from './stamina'
import { isDeadBall, startWhistle } from './whistle'
import { stepShootout } from './shootout'

function tickTimers(state, dt) {
    Object.keys(state.timers).forEach((key) => {
        state.timers[key] = Math.max(0, state.timers[key] - dt)
    })

    Object.keys(state.pickupLocks).forEach((playerId) => {
        state.pickupLocks[playerId] -= dt

        if (state.pickupLocks[playerId] <= 0) {
            delete state.pickupLocks[playerId]
        }
    })
}

// Người chơi không bấm phím trong chừng này giây → máy đá thay.
export const IDLE_LIMIT = 10

// Một bước logic trận đấu với dt cố định.
export function stepMatch(ctx, dt) {
    const { state } = ctx

    if (!ctx.ballRef.current) return

    // Phase 29D: loạt sút luân lưu chạy vòng lặp riêng.
    if (state.shootout) {
        stepShootout(ctx, dt)
        return
    }

    // Đã hết giờ và bóng chết: thổi còi (xem whistle.js). Sau bàn thắng /
    // bóng ra ngoài thì chờ hết nhịp ăn mừng / đặt bóng (goalCooldown) trước.
    if (ctx.whistlePending && !state.whistle && isDeadBall(state)) {
        if (state.timers.goalCooldown > 0) {
            state.timers.goalCooldown = Math.max(0, state.timers.goalCooldown - dt)
            return
        }

        startWhistle(ctx, ctx.whistlePending)
        return
    }

    updateIdle(ctx, dt)

    // Máy đá thay người chơi: tạm "bỏ chọn" cầu thủ để AI điều khiển cả đội.
    const userSelected = ctx.selectedId

    if (state.autoPilot) ctx.selectedId = null

    try {
        stepPlay(ctx, dt)
    } finally {
        // Engine có thể tự chọn người mới (nhận bóng, giao bóng...) → giữ lựa chọn đó.
        if (state.autoPilot && ctx.selectedId === null) ctx.selectedId = userSelected
    }
}

// Đếm thời gian người chơi không bấm phím (đang giữ phím cũng tính là đang chơi).
function updateIdle(ctx, dt) {
    const { state } = ctx
    const pressed = ctx.keys?.current || {}
    const holding = Object.values(pressed).some(Boolean)

    if (holding || ctx.autoPlay) {
        state.idleTime = 0
        return
    }

    state.idleTime = (state.idleTime || 0) + dt

    if (!state.autoPilot && state.idleTime >= IDLE_LIMIT) {
        state.autoPilot = true
        state.charge = null
        ctx.onAutoPilotChange?.(true)
        ctx.onActionMessage('AUTO PLAY - PRESS ANY KEY TO TAKE CONTROL')
    }
}

// Người chơi bấm phím bất kỳ: lấy lại quyền điều khiển.
export function noteUserInput(ctx) {
    const { state } = ctx

    state.idleTime = 0

    if (state.autoPilot) {
        state.autoPilot = false
        ctx.onAutoPilotChange?.(false)
        ctx.onActionMessage('YOU HAVE CONTROL')
    }
}

function stepPlay(ctx, dt) {
    const { state } = ctx
    const ball = ctx.ballRef.current

    tickTimers(state, dt)

    // 0. Trọng tài vừa thổi phạt (phạm lỗi / việt vị): bóng chết một nhịp,
    // mọi người đứng lại, rồi mới đặt bóng đá phạt / phạt đền (Phase 20).
    if (state.pendingRestart) {
        const pending = state.pendingRestart

        pending.delay -= dt
        ball.setLinvel({ x: 0, y: Math.min(0, ball.linvel().y), z: 0 }, true)
        trackVelocities(ctx, dt)
        updatePlayerStates(ctx, dt)
        state.deadBall = true

        if (pending.delay <= 0) {
            state.pendingRestart = null
            restartAtSpot(ctx, pending.teamId, pending.type, pending.x, pending.z, {
                indirect: pending.indirect,
            })
        }

        return
    }

    // 1. Bàn thắng / bóng ra ngoài.
    if (checkGoalAndOut(ctx)) {
        state.deadBall = true
        return
    }

    state.deadBall = false

    updateCurl(ctx, dt)

    const ballPosition = ball.translation()
    const snapshot = {
        ballPoint: { x: ballPosition.x, z: ballPosition.z },
        ownerId: state.possession,
        ownerItem: state.possession ? getPlayer(ctx, state.possession) : null,
    }

    recordPossession(state, snapshot.ownerItem?.teamId, dt)
    trackPossession(ctx, snapshot, dt)
    updateOpponentTactic(ctx, dt)

    // 2. Che bóng (giữ C / AI), cầu thủ người chơi điều khiển + thanh lực.
    updateShield(ctx, dt)
    updateControlledPlayer(ctx, dt)
    updateCharge(ctx, dt)
    updateWindup(ctx, dt)

    // 3. AI đồng đội và đối thủ.
    updateTeamAI(ctx, 'blue', snapshot, dt)
    updateTeamAI(ctx, 'red', snapshot, dt)
    updateReceiverRun(ctx, dt)
    updateAiSlides(ctx, dt)

    // 4. Thủ môn.
    updateGoalkeeper(ctx, 'blue', snapshot, dt)
    updateGoalkeeper(ctx, 'red', snapshot, dt)

    // 5. Cầu thủ AI đang giữ bóng.
    updateCarrierAI(ctx, dt)

    // Tình huống cố định đang chờ: giữ cự ly 9.15m / ra khỏi vòng cấm.
    if (state.restart) enforceRestartSpacing(ctx, dt)

    // 6. Va chạm giữa các cầu thủ.
    resolvePlayerCollisions(ctx)
    updateDuels(ctx, dt)

    // 7. Hàng rào chặn cú đá phạt, đối thủ cướp bóng, nhận bóng tự do, rê bóng.
    updateWallBlock(ctx)
    updateShotBlock(ctx)
    updateAISteal(ctx)
    updateLooseBallPickup(ctx)
    updateDribble(ctx, dt)

    // 8. Vận tốc + state machine (animation đọc kết quả này).
    trackVelocities(ctx, dt)
    updatePlayerStates(ctx, dt)
    updateStamina(ctx, dt)

    const finalBall = ball.translation()
    state.ballPosition.x = finalBall.x
    state.ballPosition.y = finalBall.y
    state.ballPosition.z = finalBall.z
}
