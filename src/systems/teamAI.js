import {
    FIELD,
    clamp,
    distance2D,
} from './constants'
import { attackDir, homePosition } from './matchState'
import {
    attachBallToPlayer,
    getPlayer,
    kickFromPlayer,
    placeBall,
    teamPlayers,
} from './ball'
import { moveAIPlayer } from './movement'
import { isPlayerLocked, setPlayerAction } from './playerState'
import { recordPlayer, recordTeam } from './matchStats'

// AI di chuyển theo vai trò và chiến thuật (không gồm thủ môn).
// `snapshot` = { ballPoint, ownerId, ownerItem } chụp ở đầu bước logic.
export function updateTeamAI(ctx, teamId, snapshot, dt) {
    const { state, objects, tactic } = ctx
    const { ballPoint, ownerId, ownerItem } = snapshot

    const teamList = teamPlayers(ctx, teamId)
    const attackDirection = attackDir(state, teamId)
    const defendDirection = -attackDirection

    const teamHasBall = ownerItem?.teamId === teamId
    const enemyHasBall = Boolean(ownerItem) && !teamHasBall

    const isUserControlled = (item) =>
        teamId === 'blue' && item.id === ctx.selectedId

    // Hai cầu thủ gần bóng nhất sẽ áp sát.
    const pressers = teamList
        .filter((item) => !isUserControlled(item) && item.role !== 'GK')
        .map((item) => ({ item, object: objects[item.id] }))
        .filter((entry) => entry.object)
        .map((entry) => ({
            id: entry.item.id,
            distance: distance2D(entry.object.position, ballPoint),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2)

    const pressingIds = new Set(pressers.map((entry) => entry.id))

    // Người gần nhất lao thẳng vào người cầm bóng nếu đủ gần
    // (pressing càng cao thì bán kính càng lớn). Trước đây cả hai người
    // chỉ tiến ~1/3 quãng đường nên đối thủ không bao giờ áp sát được.
    const closeDownRadius = 12 + tactic.press * 14

    // Giữ A khi đối thủ có bóng: gọi đồng đội gần nhất vào pressing (FO4).
    const teamPressCalled =
        teamId === 'blue' && enemyHasBall && Boolean(ctx.keys?.current?.KeyA)

    const closingId =
        pressers[0] &&
        !state.restart &&
        (teamPressCalled || pressers[0].distance < closeDownRadius)
            ? pressers[0].id
            : null

    const carrier = teamHasBall ? objects[ownerId] : null

    teamList.forEach((item) => {
        if (isUserControlled(item)) return

        // Người cầm bóng do updateCarrierAI điều khiển. Trước đây người này
        // bị di chuyển HAI lần mỗi bước (ở đây + carrier AI) nên rê bóng
        // nhanh gấp đôi bình thường.
        if (item.id === ownerId) return

        const object = objects[item.id]

        if (!object || item.role === 'GK') return

        const home = homePosition(state, item)
        const homeX = home.x
        const homeZ = home.z

        let targetX = homeX
        let targetZ = homeZ
        let speedScale = 1

        if (teamHasBall) {
            const ballX = carrier ? carrier.position.x : ballPoint.x
            const ballZ = carrier ? carrier.position.z : ballPoint.z

            if (item.role === 'FW') {
                targetZ = ballZ + attackDirection * 12
                targetX = Math.abs(homeX) > 5 ? homeX * 1.12 : ballX * 0.45
                speedScale = 1.18
            } else if (item.role === 'MF') {
                targetZ = ballZ + attackDirection * 6
                targetX = homeX * 0.72 + ballX * 0.28
                speedScale = 1.12
            } else {
                targetZ = homeZ + attackDirection * 5
                targetX = homeX * 0.9 + ballX * 0.1
                speedScale = 1.04
            }

            targetZ += (ballZ - homeZ) * 0.16

            if (Math.abs(homeX) > 5) {
                targetX += Math.sign(homeX) * 2.5 * tactic.width
            }

            const distanceToBall = distance2D(object.position, ballPoint)

            if (distanceToBall < 14 && item.id !== ownerId) {
                targetX += (ballX - targetX) * 0.18
                targetZ += (ballZ - targetZ) * 0.12
            }
        } else if (enemyHasBall) {
            const retreatDistance =
                item.role === 'FW' ? 5 : item.role === 'MF' ? 9 : 12

            targetZ =
                homeZ +
                defendDirection *
                retreatDistance *
                (1 - tactic.defensiveLine * 0.3)

            targetX = homeX * 0.82 + ballPoint.x * 0.18

            if (item.id === closingId) {
                targetX = ballPoint.x
                targetZ = ballPoint.z
                speedScale = teamPressCalled ? 1.3 : 1.15
            } else if (pressingIds.has(item.id)) {
                targetX += (ballPoint.x - targetX) * tactic.press * 0.72
                targetZ += (ballPoint.z - targetZ) * tactic.press * 0.72
                speedScale = 1.2
            } else {
                speedScale = 1.05
            }
        } else if (pressingIds.has(item.id)) {
            targetX = ballPoint.x
            targetZ = ballPoint.z
            speedScale = 1.25
        } else {
            targetZ = homeZ + attackDirection * 2
            targetX = homeX
        }

        targetX = clamp(targetX, FIELD.minX + 2, FIELD.maxX - 2)
        targetZ = clamp(targetZ, FIELD.minZ + 2, FIELD.maxZ - 2)

        moveAIPlayer(ctx, item, { x: targetX, z: targetZ }, speedScale, dt)
    })
}

// Đồng đội chạy đến vị trí dự kiến nhận đường chuyền.
export function updateReceiverRun(ctx, dt) {
    const { state, objects } = ctx
    const pendingPass = state.pendingPass
    const ball = ctx.ballRef.current

    if (!pendingPass || !ball) return

    pendingPass.elapsed += dt

    const receiverObject = objects[pendingPass.receiverId]
    const receiverItem = getPlayer(ctx, pendingPass.receiverId)

    const ballPosition = ball.translation()
    const ballVelocity = ball.linvel()

    const ballSpeed = Math.hypot(ballVelocity.x, ballVelocity.y, ballVelocity.z)
    const horizontalBallSpeed = Math.hypot(ballVelocity.x, ballVelocity.z)

    const targetPosition = { x: pendingPass.targetX, z: pendingPass.targetZ }
    const ballDistanceToTarget = distance2D(ballPosition, targetPosition)

    const passFinished =
        state.possession ||
        !receiverObject ||
        !receiverItem ||
        pendingPass.elapsed > 3.5 ||
        (pendingPass.elapsed > 0.45 && ballSpeed < 1.1) ||
        (ballDistanceToTarget < 1.4 && ballSpeed < 3.2)

    if (passFinished) {
        state.pendingPass = null
        return
    }

    // Dự đoán vị trí bóng sẽ đến dựa trên vận tốc hiện tại.
    const receiverDistance = distance2D(receiverObject.position, ballPosition)

    const interceptTime = clamp(
        receiverDistance / Math.max(horizontalBallSpeed, 2),
        0,
        1.1,
    )

    const runTarget = receiverDistance < 9
        ? {
            x: clamp(
                ballPosition.x + ballVelocity.x * interceptTime,
                FIELD.minX + 1,
                FIELD.maxX - 1,
            ),
            z: clamp(
                ballPosition.z + ballVelocity.z * interceptTime,
                FIELD.minZ + 1,
                FIELD.maxZ - 1,
            ),
        }
        : targetPosition

    moveAIPlayer(
        ctx,
        receiverItem,
        runTarget,
        pendingPass.action === 'through' ? 1.65 : 1.4,
        dt,
    )
}

// Quyết định của cầu thủ AI đang giữ bóng: sút, chuyền hoặc dẫn bóng.
export function updateCarrierAI(ctx, dt) {
    const { state, objects } = ctx
    const ownerId = state.possession
    const owner = ownerId ? objects[ownerId] : null
    const ownerItem = ownerId ? getPlayer(ctx, ownerId) : null

    if (
        !owner ||
        !ownerItem ||
        ownerId === ctx.selectedId ||
        state.timers.aiDecisionCooldown > 0
    ) {
        return
    }

    const attackDirection = attackDir(state, ownerItem.teamId)

    // AI ném biên: ném cho đồng đội phù hợp, không có thì ném xa lên trên.
    if (state.restart?.type === 'throw-in' && state.restart.playerId === ownerId) {
        if (!kickFromPlayer(ctx, ownerId, 'pass', true)) {
            kickFromPlayer(ctx, ownerId, 'lob', true)
        }

        state.timers.aiDecisionCooldown = 1.2
        return
    }

    if (ownerItem.role === 'GK') {
        if (ownerItem.teamId === 'red') {
            // Thủ môn đối thủ ưu tiên phát bóng dài lên phía trước.
            kickFromPlayer(ctx, ownerId, 'lob', true)

            // Không tìm được mục tiêu: cưỡng chế phá bóng lên phía trước.
            if (state.possession === ownerId && ctx.ballRef.current) {
                placeBall(
                    ctx,
                    owner.position.x,
                    owner.position.z + attackDirection * 1.2,
                    1.1,
                )

                ctx.ballRef.current.setLinvel(
                    { x: 0, y: 4.5, z: attackDirection * 19 },
                    true,
                )

                state.possession = null
                state.pendingPass = null
                state.lastTouchTeam = 'red'
                state.lastToucherId = ownerId
                state.kickId += 1
            }

            state.timers.aiDecisionCooldown = 2.5
        } else {
            // Thủ môn BLUE phát bóng bằng chuyền ngắn.
            kickFromPlayer(ctx, ownerId, 'pass', true)
            state.timers.aiDecisionCooldown = 2
        }

        return
    }

    const goalDistance = Math.abs(owner.position.z - attackDirection * FIELD.lineZ)

    const opponents = teamPlayers(
        ctx,
        ownerItem.teamId === 'blue' ? 'red' : 'blue',
    )

    const nearbyOpponent = opponents.some((opponent) => {
        const object = objects[opponent.id]

        return object && distance2D(object.position, owner.position) < 2.5
    })

    const goalLaneOpen = Math.abs(owner.position.x) < 17

    if (goalDistance < 23 && goalLaneOpen) {
        kickFromPlayer(ctx, ownerId, 'shoot', true)
        state.timers.aiDecisionCooldown = 1.7
    } else if (nearbyOpponent) {
        kickFromPlayer(ctx, ownerId, 'pass', true)
        state.timers.aiDecisionCooldown = 1.2
    } else {
        moveAIPlayer(
            ctx,
            ownerItem,
            {
                x: clamp(owner.position.x * 0.72, -18, 18),
                z: owner.position.z + attackDirection * 9,
            },
            0.9,
            dt,
        )
    }
}

// Đối thủ có cơ hội cướp bóng từ cầu thủ BLUE đang giữ bóng.
// Dựa vào khoảng cách tới BÓNG: bóng càng xa chân người rê càng dễ mất.
export function updateAISteal(ctx) {
    const { state, objects } = ctx
    const ownerId = state.possession
    const ownerItem = ownerId ? getPlayer(ctx, ownerId) : null
    const owner = ownerId ? objects[ownerId] : null
    const ball = ctx.ballRef.current

    if (
        ownerItem?.teamId !== 'blue' ||
        !owner ||
        !ball ||
        state.restart ||
        state.timers.aiAttemptCooldown > 0
    ) {
        return
    }

    const ballPosition = ball.translation()

    const nearestRed = ctx.redPlayers
        .filter((item) => !isPlayerLocked(state, item.id))
        .map((item) => ({ item, object: objects[item.id] }))
        .filter((entry) => entry.object)
        .map((entry) => ({
            ...entry,
            distance: distance2D(entry.object.position, ballPosition),
        }))
        .sort((a, b) => a.distance - b.distance)[0]

    if (!nearestRed || nearestRed.distance >= 1.1) return

    state.timers.aiAttemptCooldown = 1.1

    const exposure = clamp(
        (distance2D(owner.position, ballPosition) - 0.7) / 1.0,
        0,
        1,
    )

    const chance = clamp(
        0.1 +
        exposure * 0.3 +
        ((nearestRed.item.defending || 75) - (ownerItem.dribbling || 75)) *
        0.003,
        0.05,
        0.45,
    )

    nearestRed.object.rotation.y = Math.atan2(
        ballPosition.x - nearestRed.object.position.x,
        ballPosition.z - nearestRed.object.position.z,
    )

    setPlayerAction(state, nearestRed.item.id, 'tackle')

    if (Math.random() < chance) {
        state.pickupLocks[ownerId] = 0.4
        attachBallToPlayer(ctx, nearestRed.object, nearestRed.item.id)
        recordTeam(state, 'red', 'tackles')
        recordPlayer(state, nearestRed.item.id, 'tackles')
        ctx.onActionMessage(`${ctx.opponentName} WON THE BALL`)
    }
}
