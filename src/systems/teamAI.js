import {
    FIELD,
    clamp,
    distance2D,
} from './constants'
import { attackDir, homePosition } from './matchState'
import {
    attachBallToPlayer,
    findPassTarget,
    getPlayer,
    kickFromPlayer,
    placeBall,
    teamPlayers,
} from './ball'
import { moveAIPlayer } from './movement'
import { isPlayerLocked, setPlayerAction } from './playerState'
import { recordPlayer, recordTeam } from './matchStats'
import { CLEAN_TACKLE_RATE, isShielding, pokeBallLoose, startAiShield } from './duels'

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

    // Phase 17: người cầm bóng đối phương đang che bóng → người áp sát thứ
    // hai cũng lao vào, vòng sang phía có bóng.
    const carrierShielding = enemyHasBall && isShielding(state, ownerId)

    // Phase 17: thu hồi bóng. Đường chuyền của đối phương đang bay → một
    // người chạy cắt đường chuyền. Bóng tự do → người gần nhất chạy đón đầu.
    const ball = ctx.ballRef.current
    const ballVelocity = ball ? ball.linvel() : { x: 0, y: 0, z: 0 }
    const ballSpeed = Math.hypot(ballVelocity.x, ballVelocity.z)
    const intercept =
        !ownerItem && state.pendingPass && state.lastTouchTeam !== teamId
            ? findInterceptor(ctx, teamList, isUserControlled, ballPoint, ballSpeed)
            : null
    const chaseId = !ownerItem && pressers[0] ? pressers[0].id : null

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
            } else if (carrierShielding && pressingIds.has(item.id)) {
                targetX = ballPoint.x
                targetZ = ballPoint.z
                speedScale = 1.2
            } else if (pressingIds.has(item.id)) {
                targetX += (ballPoint.x - targetX) * tactic.press * 0.72
                targetZ += (ballPoint.z - targetZ) * tactic.press * 0.72
                speedScale = 1.2
            } else {
                speedScale = 1.05
            }
        } else if (intercept && intercept.id === item.id) {
            targetX = intercept.x
            targetZ = intercept.z
            speedScale = INTERCEPT_SPEED
        } else if (item.id === chaseId) {
            // Đón đầu bóng đang lăn thay vì chạy theo sau nó.
            const lead = clamp(distance2D(object.position, ballPoint) / 9, 0, 0.8)

            targetX = ballPoint.x + ballVelocity.x * lead
            targetZ = ballPoint.z + ballVelocity.z * lead
            speedScale = 1.32
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

const INTERCEPT_SPEED = 1.25

// Chọn cầu thủ có thể cắt đường chuyền của đối phương: điểm trên đường
// bóng (từ bóng tới điểm nhận) mà cầu thủ tới kịp trước hoặc gần bằng bóng.
function findInterceptor(ctx, teamList, isUserControlled, ballPoint, ballSpeed) {
    const { state, objects } = ctx
    const pass = state.pendingPass

    // Bóng bổng thì không cắt giữa đường được. Cần một nhịp phản xạ để đọc
    // đường chuyền.
    if (!pass || pass.action === 'lob' || ballSpeed < 4 || pass.elapsed < 0.2) return null

    const lineX = pass.targetX - ballPoint.x
    const lineZ = pass.targetZ - ballPoint.z
    const length = Math.hypot(lineX, lineZ)

    if (length < 3) return null

    let best = null

    teamList.forEach((item) => {
        if (isUserControlled(item) || item.role === 'GK') return
        if (isPlayerLocked(state, item.id)) return

        const object = objects[item.id]
        if (!object) return

        // Điểm gần cầu thủ nhất trên đường chuyền (bỏ đoạn sát chân người chuyền).
        const projection = clamp(
            ((object.position.x - ballPoint.x) * lineX +
                (object.position.z - ballPoint.z) * lineZ) /
            (length * length),
            0.15,
            1,
        )
        const pointX = ballPoint.x + lineX * projection
        const pointZ = ballPoint.z + lineZ * projection
        const runDistance = Math.hypot(
            pointX - object.position.x,
            pointZ - object.position.z,
        )

        if (runDistance > 6) return

        // Chỉ chạy cắt khi tới điểm chặn trước bóng.
        const pace = 5.2 + ((item.pace || 72) / 80) * 2.2
        const playerTime = Math.max(0, runDistance - 0.6) / (pace * INTERCEPT_SPEED)
        const ballTime = (length * projection) / ballSpeed
        const margin = playerTime - ballTime

        if (margin < 0 && (!best || margin < best.margin)) {
            best = { id: item.id, x: pointX, z: pointZ, margin }
        }
    })

    return best
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

    if (!owner || !ownerItem || state.timers.aiDecisionCooldown > 0) return

    const keeperHolding = state.keeperHands === ownerId

    // Người chơi điều khiển: AI không quyết định thay, trừ khi thủ môn BLUE
    // ôm bóng quá lâu (người chơi không bấm phát bóng) → tự phát bóng.
    if (ownerId === ctx.selectedId && !keeperHolding) return

    if (keeperHolding) {
        // Thủ môn BLUE: chờ người chơi phát bóng (5s), hoặc 1.5s nếu người chơi
        // đã chuyển sang điều khiển cầu thủ khác.
        if (ownerItem.teamId === 'blue') {
            const wait = ownerId === ctx.selectedId ? 5 : 1.5

            if ((state.keeperHoldTime || 0) < wait) return
        }

        distributeFromHands(ctx, ownerId)
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
            const kicked = kickFromPlayer(ctx, ownerId, 'lob', true)

            // Không tìm được mục tiêu: cưỡng chế phá bóng lên phía trước.
            // (Không kiểm tra possession vì trong nhịp vung chân thủ môn vẫn giữ bóng.)
            if (!kicked && ctx.ballRef.current) {
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
        // Bị áp sát mà chưa có đường chuyền thoáng: che bóng một nhịp chờ
        // đồng đội di chuyển, rồi mới chuyền (Phase 17).
        const option = findPassTarget(ctx, ownerId, 'pass')
        const poorOption =
            !option || option.blockedLane >= 1 || option.nearestOpponent < 2.5

        if (poorOption && state.timers.shieldCooldown <= 0 && Math.random() < 0.7) {
            const time = 0.6 + Math.random() * 0.6

            startAiShield(state, ownerId, time)
            state.timers.aiDecisionCooldown = time
        } else {
            kickFromPlayer(ctx, ownerId, 'pass', true)
            state.timers.aiDecisionCooldown = 1.2
        }
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
        state.keeperHands === ownerId ||
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
        recordTeam(state, 'red', 'tackles')
        recordPlayer(state, nearestRed.item.id, 'tackles')

        // Đoạt bóng gọn, hoặc chỉ chọc được bóng văng ra.
        if (Math.random() > CLEAN_TACKLE_RATE) {
            pokeBallLoose(ctx, nearestRed.object, ownerId, nearestRed.item.id, 'red')
            ctx.onActionMessage(`${ctx.opponentName} POKED THE BALL LOOSE`)
            return
        }

        state.pickupLocks[ownerId] = 0.4
        attachBallToPlayer(ctx, nearestRed.object, nearestRed.item.id)
        ctx.onActionMessage(`${ctx.opponentName} WON THE BALL`)
    }
}

// Thủ môn AI phát bóng sau khi bắt được: ném tay cho đồng đội trống ở
// khoảng 8–30m, không có thì phát bóng dài bằng chân.
function distributeFromHands(ctx, keeperId) {
    const { state } = ctx
    const target = findPassTarget(ctx, keeperId, 'pass')
    const open =
        target &&
        target.item.role !== 'GK' &&
        target.distance >= 8 &&
        target.distance <= 30 &&
        target.nearestOpponent > 4 &&
        target.blockedLane < 1

    const kicked = kickFromPlayer(ctx, keeperId, open ? 'pass' : 'lob', true)

    state.timers.aiDecisionCooldown = kicked ? 1.5 : 0.5
}
