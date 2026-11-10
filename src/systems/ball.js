import * as THREE from 'three'
import {
    FIELD,
    clamp,
    distance2D,
    facingVector,
} from './constants'
import { attackDir } from './matchState'
import { isPlayerLocked, setPlayerAction } from './playerState'
import { recordPlayer, recordTeam } from './matchStats'

export const getPlayer = (ctx, playerId) => ctx.byId.get(playerId)

// Góc tối đa (rad) giữa hướng ngắm và đồng đội để vẫn được chọn (~70°).
const MAX_AIM_ANGLE = 1.22

// Lực (0..1) quyết định khoảng cách chuyền mong muốn.
export function desiredPassDistance(action, power) {
    if (action === 'through') return 10 + power * 24
    if (action === 'lob') return 14 + power * 30
    return 6 + power * 22
}

export const teamPlayers = (ctx, teamId) =>
    teamId === 'blue' ? ctx.bluePlayers : ctx.redPlayers

export function getBallDistance(ctx, object) {
    const ball = ctx.ballRef.current

    if (!ball || !object) return Infinity

    const position = ball.translation()

    return Math.hypot(
        position.x - object.position.x,
        position.z - object.position.z,
    )
}

export function placeBall(ctx, x, z, y = 0.39) {
    const ball = ctx.ballRef.current

    if (!ball) return

    ball.setTranslation({ x, y, z }, true)
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
}

export function attachBallToPlayer(ctx, object, playerId) {
    if (!ctx.ballRef.current || !object) return

    const { state } = ctx
    const item = getPlayer(ctx, playerId)
    const direction = facingVector(object.rotation.y)

    placeBall(
        ctx,
        object.position.x + direction.x * 0.85,
        object.position.z + direction.z * 0.85,
    )

    state.possession = playerId
    state.pendingPass = null
    state.lastToucherId = playerId

    if (item) {
        state.lastTouchTeam = item.teamId

        // Đội khác có bóng: đường chuyền trước đó không còn tính kiến tạo.
        if (state.stats && state.stats.lastPassTeam !== item.teamId) {
            state.stats.lastPasserId = null
            state.stats.lastPassTeam = null
        }
    }
}

export function findPassTarget(ctx, playerId, action, aim = null) {
    const { state, objects } = ctx
    const player = objects[playerId]
    const item = getPlayer(ctx, playerId)

    if (!player || !item) return null

    const teamList = teamPlayers(ctx, item.teamId)
    const opponents = teamPlayers(
        ctx,
        item.teamId === 'blue' ? 'red' : 'blue',
    )
    const attackDirection = attackDir(state, item.teamId)

    const candidates = teamList
        .filter((teammate) => teammate.id !== playerId)
        .map((teammate) => ({
            item: teammate,
            object: objects[teammate.id],
        }))
        .filter((entry) => entry.object)
        .map((entry) => {
            const teammate = entry.object
            const velocity = state.velocities[entry.item.id] || {
                x: 0,
                z: 0,
            }

            const dx = teammate.position.x - player.position.x
            const dz = teammate.position.z - player.position.z
            const currentDistance = Math.hypot(dx, dz)

            const leadTime =
                action === 'through'
                    ? clamp(currentDistance / 10, 0.4, 1.15)
                    : action === 'lob'
                        ? clamp(currentDistance / 10, 0.4, 0.9)
                        : clamp(currentDistance / 12, 0.2, 0.6)

            let targetX = teammate.position.x + velocity.x * leadTime
            let targetZ = teammate.position.z + velocity.z * leadTime

            // Chọc khe phải hướng vào khoảng trống phía trước.
            if (action === 'through') {
                targetZ += attackDirection * clamp(
                    1.5 + currentDistance * 0.1,
                    2,
                    4,
                )
            }

            targetX = clamp(targetX, FIELD.minX + 1, FIELD.maxX - 1)
            targetZ = clamp(targetZ, FIELD.minZ + 1, FIELD.maxZ - 1)

            const distance = Math.hypot(
                targetX - player.position.x,
                targetZ - player.position.z,
            )

            const forwardGap =
                (targetZ - player.position.z) * attackDirection

            let score = distance
            let outOfAim = false

            if (aim) {
                // Chuyền theo hướng người chơi chọn: ưu tiên đồng đội gần hướng
                // ngắm và ở khoảng cách tương ứng với lực giữ phím.
                const length = distance || 1
                const dot =
                    ((targetX - player.position.x) / length) * aim.direction.x +
                    ((targetZ - player.position.z) / length) * aim.direction.z
                const angle = Math.acos(clamp(dot, -1, 1))
                const desired = desiredPassDistance(action, aim.power)

                score = angle * 14 + Math.abs(distance - desired) * 0.5
                outOfAim = angle > MAX_AIM_ANGLE

                if (outOfAim) score += 1000
            } else {
                // Ưu tiên khoảng cách chuyền hợp lý.
                if (action === 'pass') {
                    if (distance < 4) score += (4 - distance) * 3
                    if (distance > 17) score += (distance - 17) * 2

                    if (forwardGap < -2) {
                        score += Math.abs(forwardGap) * 2.5
                    }

                    if (forwardGap > 0) {
                        score -= Math.min(forwardGap, 8) * 0.45
                    }
                }

                if (action === 'through') {
                    if (forwardGap < 3) {
                        score += (3 - forwardGap) * 5
                    }

                    if (distance < 7) score += (7 - distance) * 2
                    if (distance > 23) score += (distance - 23) * 2

                    score -= clamp(forwardGap, 0, 16) * 0.8
                }

                if (action === 'lob') {
                    if (forwardGap < 1) score += (1 - forwardGap) * 3
                    if (distance < 7) score += (7 - distance) * 1.5
                    if (distance > 25) score += (distance - 25) * 1.5
                }
            }

            let nearestOpponent = Infinity
            let blockedLane = 0

            opponents.forEach((opponent) => {
                const opponentObject = objects[opponent.id]
                if (!opponentObject) return

                const opponentDistance = Math.hypot(
                    opponentObject.position.x - targetX,
                    opponentObject.position.z - targetZ,
                )

                nearestOpponent = Math.min(
                    nearestOpponent,
                    opponentDistance,
                )

                // Khoảng cách từ đối phương đến đường chuyền.
                const lineX = targetX - player.position.x
                const lineZ = targetZ - player.position.z
                const lengthSq = lineX * lineX + lineZ * lineZ

                if (lengthSq < 0.001) return

                const projection = clamp(
                    (
                        (opponentObject.position.x - player.position.x) * lineX +
                        (opponentObject.position.z - player.position.z) * lineZ
                    ) / lengthSq,
                    0,
                    1,
                )

                const closestX = player.position.x + lineX * projection
                const closestZ = player.position.z + lineZ * projection

                const laneDistance = Math.hypot(
                    opponentObject.position.x - closestX,
                    opponentObject.position.z - closestZ,
                )

                if (projection > 0.08 && projection < 0.92) {
                    if (laneDistance < 1.8) {
                        blockedLane += 1
                    } else if (laneDistance < 3.2) {
                        blockedLane += 0.5
                    }
                }
            })

            // Tránh chuyền cho người đang bị áp sát.
            if (nearestOpponent < 2.5) {
                score += (2.5 - nearestOpponent) * 5
            } else if (nearestOpponent > 6) {
                score -= 1.5
            }

            // Tránh đường chuyền bị đối phương chắn.
            score += blockedLane * (action === 'lob' ? 3 : 9)

            return {
                ...entry,
                distance,
                targetPosition: {
                    x: targetX,
                    z: targetZ,
                },
                score,
                outOfAim,
            }
        })
        .sort((a, b) => a.score - b.score)

    return candidates[0] || null
}

// options (chỉ người chơi dùng):
//   power    0..1  lực tích được khi giữ phím
//   aimInput Vector3 | null  hướng phím mũi tên lúc nhả phím
export function kickFromPlayer(ctx, playerId, action, isAI = false, options = {}) {
    const { state, objects } = ctx
    const player = objects[playerId]
    const item = getPlayer(ctx, playerId)
    const ball = ctx.ballRef.current

    if (!player || !item || !ball) return false

    if (state.possession && state.possession !== playerId) {
        return false
    }

    // Ném biên: chỉ ném gần (S) hoặc ném xa (A/W→gần), không sút được.
    const isThrowIn =
        state.restart?.type === 'throw-in' && state.restart.playerId === playerId

    if (isThrowIn && action === 'shoot') {
        if (!isAI) ctx.onActionMessage('THROW-IN: S SHORT · A LONG')
        return false
    }

    if (isThrowIn && action === 'through') {
        action = 'pass'
    }

    const attackDirection = attackDir(state, item.teamId)

    const direction = new THREE.Vector3(0, 0, attackDirection)

    const charge = options.power
    const isCharged = typeof charge === 'number'
    const aimInput = options.aimInput || null

    let power = 8
    let lift = 0.22
    let message = 'SHORT PASS'
    let passTarget = null
    let spaceReceiver = null

    if (action === 'pass' || action === 'through' || action === 'lob') {
        // Người chơi: ngắm theo phím mũi tên, không bấm thì theo hướng mặt.
        const aim = isCharged
            ? {
                direction: aimInput
                    ? aimInput.clone().normalize()
                    : facingVector(player.rotation.y),
                power: charge,
            }
            : null

        passTarget = findPassTarget(ctx, playerId, action, aim)

        let distance = passTarget?.distance || 10

        if (aim && (!passTarget || passTarget.outOfAim)) {
            // Không có đồng đội theo hướng ngắm: chuyền vào khoảng trống,
            // đồng đội gần điểm rơi nhất sẽ chạy tới đón.
            passTarget = null
            distance = desiredPassDistance(action, charge)
            direction.copy(aim.direction)

            const spot = {
                x: clamp(player.position.x + direction.x * distance, FIELD.minX + 1, FIELD.maxX - 1),
                z: clamp(player.position.z + direction.z * distance, FIELD.minZ + 1, FIELD.maxZ - 1),
            }

            const nearest = teamPlayers(ctx, item.teamId)
                .filter((mate) => mate.id !== playerId && mate.role !== 'GK')
                .map((mate) => ({ mate, object: objects[mate.id] }))
                .filter((entry) => entry.object)
                .sort(
                    (a, b) =>
                        distance2D(a.object.position, spot) -
                        distance2D(b.object.position, spot),
                )[0]

            if (nearest) {
                spaceReceiver = { id: nearest.mate.id, spot }
            }
        } else if (!passTarget && item.role !== 'GK') {
            if (!isAI) {
                ctx.onActionMessage('NO AVAILABLE PASS TARGET')
            }

            return false
        }

        if (passTarget) {
            const target = passTarget.targetPosition

            direction.set(
                target.x - player.position.x,
                0,
                target.z - player.position.z,
            ).normalize()
        }

        if (!passTarget && item.role === 'GK') {
            // Không có đồng đội phù hợp: thủ môn phá bóng lên phía trước.
            direction.set(0, 0, attackDirection)

            power = 18
            lift = 3.8
            message = 'GOALKEEPER CLEARANCE'
        } else if (action === 'pass') {
            power = clamp(11 + distance * 0.28, 12, 17)
            lift = 0.02
            message = item.role === 'GK' ? 'GOALKEEPER PASS' : 'SHORT PASS'
        } else if (action === 'through') {
            power = clamp(14 + distance * 0.25, 15, 20)
            lift = 0.08
            message = 'THROUGH BALL'
        } else if (action === 'lob') {
            power = clamp(11 + distance * 0.2, 12, 16)
            lift = 4.5
            message = 'LOFTED PASS'
        }
    } else if (action === 'shoot') {
        const goalZ = attackDirection * FIELD.lineZ

        const distanceToGoal = Math.abs(goalZ - player.position.z)

        // Chỉ số dứt điểm ảnh hưởng độ chính xác.
        const finishing = clamp(
            item.finishing || item.shooting || item.overall || 70,
            40,
            99,
        )

        // Cầu thủ dứt điểm tốt có độ lệch nhỏ hơn.
        const accuracy = (finishing - 40) / 59

        let targetX

        if (isCharged) {
            // Người chơi ngắm bằng phím: thành phần ngang (trục X) chọn góc.
            // Lực quá mạnh (>80%) hoặc sút quá xa thì dễ lệch.
            targetX = (aimInput ? aimInput.x : 0) * 3.1

            const spread =
                (1 - accuracy) * 1.6 +
                Math.max(0, charge - 0.8) * 5 +
                Math.max(0, distanceToGoal - 22) * 0.06

            targetX += (Math.random() * 2 - 1) * spread
        } else {
            const spread = 5 - accuracy * 3
            targetX = (Math.random() * 2 - 1) * spread
        }

        direction.set(
            targetX - player.position.x,
            0,
            goalZ - player.position.z,
        ).normalize()

        if (isCharged) {
            // Lực giữ phím quyết định tốc độ (~17–30 m/s) và độ bổng.
            // Trên 90% lực bóng có thể vọt xà.
            power = 15 + charge * 12 + finishing * 0.03
            lift =
                0.5 +
                charge * 2 +
                distanceToGoal * 0.025 +
                Math.max(0, charge - 0.9) * 10 * Math.random() * 3.5
            message = charge > 0.9 ? 'POWER SHOT!' : 'SHOT!'
        } else {
            // AI: vận tốc thật 22–29 m/s, sút xa bổng hơn một chút.
            power = clamp(
                19 + finishing * 0.08 + (distanceToGoal > 20 ? 1.5 : 0),
                22,
                29,
            )

            lift = clamp(1.2 + distanceToGoal * 0.06, 1.2, 3.2)
            message = 'SHOT!'
        }
    }

    if (isThrowIn) {
        // Ném bằng tay: chậm và ngắn hơn đá, bóng bay bổng từ trên đầu.
        const throwDistance = passTarget?.distance ?? (action === 'lob' ? 18 : 10)

        power = action === 'lob'
            ? clamp(10 + throwDistance * 0.2, 11, 16)
            : clamp(7 + throwDistance * 0.3, 8, 13)
        lift = action === 'lob' ? 5 : 3
        message = action === 'lob' ? 'LONG THROW-IN' : 'THROW-IN'
    }

    // Quay người về hướng đá để animation đúng hướng.
    player.rotation.y = Math.atan2(direction.x, direction.z)

    ball.setTranslation(
        {
            x: player.position.x + direction.x * (isThrowIn ? 0.4 : 0.95),
            y: isThrowIn ? 2.1 : 0.48,
            z: player.position.z + direction.z * (isThrowIn ? 0.4 : 0.95),
        },
        true,
    )

    ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    ball.setLinvel({
        x: direction.x * power,
        y: lift,
        z: direction.z * power,
    }, true)

    state.kickId += 1
    state.possession = null
    state.lastTouchTeam = item.teamId
    state.lastToucherId = playerId

    // Thống kê: sút / chuyền (ném biên không tính).
    if (action === 'shoot') {
        recordTeam(state, item.teamId, 'shots')
        recordPlayer(state, playerId, 'shots')
    } else if (!isThrowIn) {
        recordTeam(state, item.teamId, 'passes')
        recordPlayer(state, playerId, 'passes')

        if (state.stats) {
            state.stats.lastPasserId = playerId
            state.stats.lastPassTeam = item.teamId
        }
    }

    // Người vừa đá không được "đỡ" lại chính cú đá của mình. Trước đây
    // bóng vừa rời chân (cách ~1m) bị chính người đá khống chế lại ngay,
    // nên thủ môn cầm bóng mãi và đường chuyền có thể bật về chân người chuyền.
    state.pickupLocks[playerId] = isThrowIn ? 1 : 0.4

    if (isThrowIn) {
        state.restart = null
        setPlayerAction(state, playerId, 'throw')
    } else {
        setPlayerAction(state, playerId, action === 'shoot' ? 'shoot' : 'pass')
    }

    // Ghi nhớ đồng đội đang được chuyền bóng tới.
    if (passTarget) {
        state.pendingPass = {
            receiverId: passTarget.item.id,
            targetX: passTarget.targetPosition.x,
            targetZ: passTarget.targetPosition.z,
            action,
            elapsed: 0,
        }
    } else if (spaceReceiver) {
        state.pendingPass = {
            receiverId: spaceReceiver.id,
            targetX: spaceReceiver.spot.x,
            targetZ: spaceReceiver.spot.z,
            action,
            elapsed: 0,
        }
        message = 'PASS INTO SPACE'
    } else {
        state.pendingPass = null
    }

    if (!isAI) {
        ctx.onActionMessage(message)
    }

    return true
}

// Cầu thủ ở gần có thể đỡ/khống chế bóng tự do.
export function updateLooseBallPickup(ctx) {
    const { state, objects } = ctx
    const ball = ctx.ballRef.current

    if (state.possession || !ball) return

    const ballPosition = ball.translation()
    const velocity = ball.linvel()
    const ballSpeed = Math.hypot(velocity.x, velocity.y, velocity.z)

    // Bóng quá cao thì cầu thủ chưa thể khống chế bằng chân.
    if (ballPosition.y >= 1.55) return

    let best = null
    let bestScore = Infinity

    ctx.players.forEach((item) => {
        const object = objects[item.id]
        if (!object) return

        const distance = distance2D(object.position, ballPosition)

        if (distance > 1.5) return

        if (state.pickupLocks[item.id] > 0) return

        // Đang xoạc hoặc nằm sân thì không khống chế được.
        const entry = state.playerStates[item.id]
        if (entry && entry.state === 'fallen' && entry.time > 0) return

        // Ưu tiên người được chuyền tới,
        // nhưng đối phương vẫn có thể cắt bóng nếu ở gần hơn.
        const isIntendedReceiver =
            state.pendingPass?.receiverId === item.id
        const score = distance - (isIntendedReceiver ? 0.25 : 0)

        if (score < bestScore) {
            bestScore = score
            best = { item, object }
        }
    })

    if (!best) return

    if (ballSpeed > 7.5) {
        // Chạm bước một: giảm tốc bóng trước khi kiểm soát.
        ball.setLinvel(
            {
                x: velocity.x * 0.48,
                y: Math.max(0, velocity.y * 0.25),
                z: velocity.z * 0.48,
            },
            true,
        )

        const angular = ball.angvel()

        ball.setAngvel(
            {
                x: angular.x * 0.5,
                y: angular.y * 0.5,
                z: angular.z * 0.5,
            },
            true,
        )

        return
    }

    // Bóng đã đủ chậm: cầu thủ khống chế và nhận quyền sở hữu.
    attachBallToPlayer(ctx, best.object, best.item.id)

    // Như FO4: cầu thủ BLUE nhận bóng được chọn điều khiển ngay
    // (thủ môn vẫn để AI phát bóng).
    if (best.item.teamId === 'blue' && best.item.role !== 'GK') {
        ctx.onSelect(best.item.id)
        ctx.selectedId = best.item.id
    }

    ctx.onActionMessage(
        best.item.teamId === 'blue'
            ? 'BLUE FC FIRST TOUCH'
            : `${ctx.opponentName} FIRST TOUCH`,
    )
}

// ---- Rê bóng bằng nhịp chạm ----
// Bóng không còn "dính" vào chân: mỗi lần chạm, bóng được đẩy lên trước
// nhanh hơn người một chút rồi chậm dần (ma sát cỏ). Chạy nước rút thì
// chạm mạnh, bóng xa chân hơn → dễ bị cắt. Đổi hướng gấp khi bóng đang ở
// xa có thể mất bóng.
const DRIBBLE = {
    footOffset: 0.6,      // bóng lùi về gần chân hơn mức này thì chạm tiếp
    touchReach: 1.2,      // trong tầm này mới chạm được bóng
    loseDistance: 2.8,    // bóng xa hơn thế là mất kiểm soát
    damping: 1.5,         // ma sát cỏ khi đang rê (1/s)
    touchInterval: 0.18,  // khoảng cách tối thiểu giữa hai lần chạm
}

export function updateDribble(ctx, dt) {
    const { state, objects } = ctx
    const ball = ctx.ballRef.current
    const ownerId = state.possession
    const owner = ownerId ? objects[ownerId] : null
    const item = ownerId ? getPlayer(ctx, ownerId) : null

    if (!owner || !ball || !item) return

    // Đang chờ ném biên: bóng nằm trong hai tay, trên đầu.
    if (state.restart?.type === 'throw-in' && state.restart.playerId === ownerId) {
        const facing = facingVector(owner.rotation.y)

        ball.setTranslation(
            {
                x: owner.position.x + facing.x * 0.12,
                y: 2.15,
                z: owner.position.z + facing.z * 0.12,
            },
            true,
        )
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
        return
    }

    const isControlled = ownerId === ctx.selectedId

    let moveX = 0
    let moveZ = 0
    let speed = 0
    let sprinting = false

    if (isControlled) {
        moveX = state.dribble.x
        moveZ = state.dribble.z
        sprinting = state.dribble.sprinting
        speed = Math.hypot(moveX, moveZ) > 0 ? state.dribble.speed : 0
    } else {
        const velocity = state.velocities[ownerId] || { x: 0, z: 0 }

        speed = Math.hypot(velocity.x, velocity.z)
        sprinting = speed > 6.5

        if (speed > 0.01) {
            moveX = velocity.x / speed
            moveZ = velocity.z / speed
        }
    }

    const position = ball.translation()
    const velocity = ball.linvel()
    const dx = position.x - owner.position.x
    const dz = position.z - owner.position.z
    const distance = Math.hypot(dx, dz)

    state.dribble.touchTimer = Math.max(0, (state.dribble.touchTimer || 0) - dt)

    // Bóng chạy quá xa chân (chạm quá mạnh, đổi hướng gấp): mất bóng.
    if (distance > DRIBBLE.loseDistance) {
        state.possession = null
        state.pendingPass = null

        if (isControlled) {
            ctx.onActionMessage('HEAVY TOUCH!')
        }

        return
    }

    // Đối thủ đứng sát bóng lúc bóng xa chân người rê → cắt được bóng.
    if (distance > 0.95) {
        const thief = ctx.players.find((other) => {
            if (other.teamId === item.teamId) return false
            if (isPlayerLocked(state, other.id)) return false

            const object = objects[other.id]

            return object && distance2D(object.position, position) < 0.8
        })

        if (thief) {
            attachBallToPlayer(ctx, objects[thief.id], thief.id)
            recordTeam(state, thief.teamId, 'tackles')
            recordPlayer(state, thief.id, 'tackles')
            ctx.onActionMessage(
                thief.teamId === 'blue'
                    ? 'BLUE FC INTERCEPTS!'
                    : `${ctx.opponentName} INTERCEPTS!`,
            )
            return
        }
    }

    // Ma sát cỏ: bóng đang rê chậm dần.
    const damp = Math.exp(-DRIBBLE.damping * dt)

    if (speed < 0.5) {
        // Đứng yên: kéo bóng về trước chân.
        const facing = facingVector(owner.rotation.y)
        const targetX = owner.position.x + facing.x * DRIBBLE.footOffset
        const targetZ = owner.position.z + facing.z * DRIBBLE.footOffset

        if (distance < DRIBBLE.touchReach + 0.4) {
            const t = Math.min(1, dt * 10)

            ball.setTranslation(
                {
                    x: position.x + (targetX - position.x) * t,
                    y: 0.39,
                    z: position.z + (targetZ - position.z) * t,
                },
                true,
            )
            ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        } else {
            ball.setLinvel(
                { x: velocity.x * damp, y: velocity.y, z: velocity.z * damp },
                true,
            )
        }

        return
    }

    ball.setLinvel(
        { x: velocity.x * damp, y: velocity.y, z: velocity.z * damp },
        true,
    )

    // Chỉ chạm được khi bóng đã về gần chân (theo hướng chạy).
    // Khi đổi hướng, "ahead" theo hướng mới nhỏ → chạm để kéo bóng theo.
    const ahead = dx * moveX + dz * moveZ

    const needsTouch =
        state.dribble.touchTimer <= 0 &&
        distance < DRIBBLE.touchReach &&
        ahead < DRIBBLE.footOffset

    if (!needsTouch) return

    // Kỹ năng rê bóng càng cao, hướng chạm càng chuẩn.
    const skill = clamp(((item.dribbling || 70) - 50) / 45, 0, 1)
    const error =
        (Math.random() * 2 - 1) *
        (0.22 - skill * 0.17) *
        (sprinting ? 1.5 : 1)

    const cos = Math.cos(error)
    const sin = Math.sin(error)
    const dirX = moveX * cos - moveZ * sin
    const dirZ = moveX * sin + moveZ * cos

    // Jog: bóng cách chân ~0.6–0.8m, ~2 chạm/giây.
    // Sprint: bóng ra xa tới ~1.4m → nhanh nhưng dễ bị cắt.
    const touchSpeed = speed * (sprinting ? 1.7 : 1.4)

    // Bóng ở sau/ngang người thì đưa lên trước chân rồi mới đẩy.
    if (ahead < 0.3) {
        ball.setTranslation(
            {
                x: owner.position.x + dirX * 0.6,
                y: 0.39,
                z: owner.position.z + dirZ * 0.6,
            },
            true,
        )
    }

    ball.setLinvel({ x: dirX * touchSpeed, y: 0, z: dirZ * touchSpeed }, true)
    state.dribble.touchTimer = DRIBBLE.touchInterval
}
