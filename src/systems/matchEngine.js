import { getPlayer, updateDribble, updateLooseBallPickup, updateWindup } from './ball'
import { checkGoalAndOut } from './rules'
import { updateCharge, updateControlledPlayer } from './control'
import {
    updateAISteal,
    updateCarrierAI,
    updateReceiverRun,
    updateTeamAI,
} from './teamAI'
import { updateGoalkeeper } from './goalkeeper'
import { resolvePlayerCollisions, trackVelocities } from './movement'
import { updatePlayerStates } from './playerState'
import { recordPossession } from './matchStats'
import { updateDuels, updateShield } from './duels'

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

// Một bước logic trận đấu với dt cố định.
export function stepMatch(ctx, dt) {
    const { state } = ctx
    const ball = ctx.ballRef.current

    if (!ball) return

    tickTimers(state, dt)

    // 1. Bàn thắng / bóng ra ngoài.
    if (checkGoalAndOut(ctx)) return

    const ballPosition = ball.translation()
    const snapshot = {
        ballPoint: { x: ballPosition.x, z: ballPosition.z },
        ownerId: state.possession,
        ownerItem: state.possession ? getPlayer(ctx, state.possession) : null,
    }

    recordPossession(state, snapshot.ownerItem?.teamId, dt)

    // 2. Che bóng (giữ C / AI), cầu thủ người chơi điều khiển + thanh lực.
    updateShield(ctx, dt)
    updateControlledPlayer(ctx, dt)
    updateCharge(ctx, dt)
    updateWindup(ctx, dt)

    // 3. AI đồng đội và đối thủ.
    updateTeamAI(ctx, 'blue', snapshot, dt)
    updateTeamAI(ctx, 'red', snapshot, dt)
    updateReceiverRun(ctx, dt)

    // 4. Thủ môn.
    updateGoalkeeper(ctx, 'blue', snapshot, dt)
    updateGoalkeeper(ctx, 'red', snapshot, dt)

    // 5. Cầu thủ AI đang giữ bóng.
    updateCarrierAI(ctx, dt)

    // 6. Va chạm giữa các cầu thủ.
    resolvePlayerCollisions(ctx)
    updateDuels(ctx, dt)

    // 7. Đối thủ cướp bóng, nhận bóng tự do, rê bóng.
    updateAISteal(ctx)
    updateLooseBallPickup(ctx)
    updateDribble(ctx, dt)

    // 8. Vận tốc + state machine (animation đọc kết quả này).
    trackVelocities(ctx, dt)
    updatePlayerStates(ctx, dt)

    const finalBall = ball.translation()
    state.ballPosition.x = finalBall.x
    state.ballPosition.y = finalBall.y
    state.ballPosition.z = finalBall.z
}
