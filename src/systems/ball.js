import * as THREE from 'three'
import {
    FIELD,
    clamp,
    distance2D,
    facingVector,
    KICK_POWER,
    kickPowerScale,
    ACCURACY,
    aiCornerError,
    aiShotSpread,
    passAngleError,
    passPowerError,
    shotLiftError,
    shotSpread,
} from './constants'
import { attackDir } from './matchState'
import { setPlayerAction } from './playerState'
import { closePass, openPass, recordPlayer, recordShot, recordTeam, shotXg } from './matchStats'
import { attr, skill01 } from './attributes'
import { fatiguePenalty } from './stamina'
import { checkOffside, isOffsidePosition, offsideLine, snapshotOffside } from './referee'

export const getPlayer = (ctx, playerId) => ctx.byId.get(playerId)

// Tổ hợp phím mũi tên đang giữ (vd. "ArrowDown+ArrowRight").
export function heldArrows(keys) {
    const pressed = keys?.current || {}

    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
        .filter((key) => pressed[key])
        .join('+')
}

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
    state.deflection = null

    // Phase 21: kết thúc đường chuyền đang bay (thành công nếu là đồng đội).
    if (item) closePass(state, item.teamId)
    state.lastToucherId = playerId
    // Người khác chạm bóng: thủ môn không còn ôm bóng (keeperCatch đặt lại sau).
    state.keeperHands = null
    // Nhịp chạm bóng là của người rê trước đó; người mới được chạm ngay.
    // (Trước đây người vừa nhận bóng rồi quay đầu chạy có thể bỏ quên bóng.)
    if (state.dribble) state.dribble.touchTimer = 0

    if (item) {
        state.lastTouchTeam = item.teamId

        // Đội khác có bóng: đường chuyền trước đó không còn tính kiến tạo.
        if (state.stats && state.stats.lastPassTeam !== item.teamId) {
            state.stats.lastPasserId = null
            state.stats.lastPassTeam = null
        }
    }
}

// Tốc độ trung bình của bóng trên đường tới người nhận (m/s): bóng mất
// khoảng 1/4 tốc độ ban đầu do ma sát cỏ. Dùng để ước lượng đối phương có
// kịp chặn đường chuyền không.
const passTravelSpeed = (action, distance) => {
    if (action === 'through') return clamp(14 + distance * 0.32, 15, 22) * 0.75
    if (action === 'lob') return clamp(11 + distance * 0.2, 12, 16) * 0.9

    return clamp(12 + distance * 0.38, 13, 20) * 0.75
}

export function findPassTarget(ctx, playerId, action, aim = null, receiverId = null) {
    const candidates = listPassCandidates(ctx, playerId, action, aim)

    if (receiverId) {
        return candidates.find((entry) => entry.item.id === receiverId) || null
    }

    return candidates[0] || null
}

// Mọi đồng đội có thể nhận bóng, đã chấm điểm (điểm thấp = tốt), kèm số liệu
// cho AI cầm bóng (carrierAI.js): laneSlack, nearestOpponent, blockedLane.
export function listPassCandidates(ctx, playerId, action, aim = null) {
    const { state, objects } = ctx
    const player = objects[playerId]
    const item = getPlayer(ctx, playerId)

    if (!player || !item) return []

    const teamList = teamPlayers(ctx, item.teamId)
    const opponents = teamPlayers(
        ctx,
        item.teamId === 'blue' ? 'red' : 'blue',
    )
    const attackDirection = attackDir(state, item.teamId)

    // Phase 20: vạch việt vị thật (người đứng thứ hai từ dưới lên của đối phương).
    const ballNow = ctx.ballRef.current?.translation() || player.position
    const realOffsideLine = offsideLine(ctx, item.teamId)
    const ballDepth = ballNow.z * attackDirection

    // Hậu vệ đứng thấp nhất của đối phương (không tính thủ môn), theo trục tấn công.
    const lastLine = opponents.reduce((deepest, opponent) => {
        const object = objects[opponent.id]

        if (!object || opponent.role === 'GK') return deepest

        return Math.max(deepest, object.position.z * attackDirection)
    }, -Infinity)

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

            // Chọc khe phải hướng vào khoảng trống phía trước. Người nhận đã
            // đứng ngang/sau hậu vệ cuối cùng (không còn ai phía trước ngoài
            // thủ môn) thì chọc sâu hơn để họ bứt tốc đón bóng.
            if (action === 'through') {
                const receiverAdvance = teammate.position.z * attackDirection
                const behindLine = receiverAdvance >= lastLine - 1.5

                targetZ += attackDirection * (clamp(
                    1.5 + currentDistance * 0.1,
                    2,
                    4,
                ) + (behindLine ? 5 : 0))
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
                let angle = Math.acos(clamp(dot, -1, 1))
                const desired = desiredPassDistance(action, aim.power)

                // Chọc khe (playtest 3): điểm đón bóng nằm trước mặt người nhận
                // vài mét, nên ngắm thẳng vào người đồng đội cũng phải tính là
                // "đúng hướng" (trước đây chỉ so với điểm đón → hay lệch góc,
                // không ai hợp lệ, bóng bị chọc bừa vào khoảng trống).
                if (action === 'through' && currentDistance > 0.1) {
                    const mateDot = (dx / currentDistance) * aim.direction.x + (dz / currentDistance) * aim.direction.z

                    angle = Math.min(angle, Math.acos(clamp(mateDot, -1, 1)))
                }

                // aim.loose: không bấm hướng → chỉ dựa vào hướng mặt, chọn rộng hơn.
                const maxAngle = aim.loose ? 1.9 : MAX_AIM_ANGLE

                score =
                    angle * (aim.loose ? 6 : 14) +
                    Math.abs(distance - desired) * (action === 'through' ? 0.3 : 0.5)

                // Chọc khe ưu tiên người đang ở phía trên, chạy vào khoảng trống.
                if (action === 'through') {
                    score -= clamp(forwardGap, 0, 16) * (aim.loose ? 0.9 : 0.45)

                    if (forwardGap < 2) score += (2 - forwardGap) * 3
                }

                outOfAim = angle > maxAngle

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
            // laneSlack: khoảng "dư" (m) của đường chuyền trước người có khả
            // năng chặn nhất. > 0: bóng qua trước khi họ kịp chạm; < 0: bị cắt.
            let laneSlack = Infinity
            const travelSpeed = passTravelSpeed(action, distance)

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

                // Quãng đường bóng đã đi khi ngang qua đối thủ này.
                const along = Math.sqrt(lengthSq) * projection

                // Trước đây bỏ qua 8% đầu đường chuyền, nên người áp sát ngay
                // trước mặt người chuyền không được tính là "chắn đường".
                if (along > 0.5 && projection < 0.92) {
                    if (laneDistance < 1.8) {
                        blockedLane += 1
                    } else if (laneDistance < 3.2) {
                        blockedLane += 0.5
                    }
                }

                // Đối thủ chạy ~6 m/s vào đường bóng trong lúc bóng bay tới
                // (bóng bổng chỉ chặn được lúc vừa rời chân và ở đoạn cuối).
                if (action !== 'lob' || projection > 0.8 || along < 4) {
                    const slack =
                        laneDistance - 0.9 - 6 * (along / travelSpeed) * 0.75

                    laneSlack = Math.min(laneSlack, slack)
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

            // Đồng đội đang ở vị trí việt vị: máy không chuyền cho (người chơi
            // thì vẫn chuyền được — và bị thổi việt vị).
            const offside = isOffsidePosition(ctx, entry.item, teammate, realOffsideLine, ballDepth)

            if (offside && !aim) score += 80

            return {
                ...entry,
                distance,
                targetPosition: {
                    x: targetX,
                    z: targetZ,
                },
                score,
                outOfAim,
                offside,
                nearestOpponent,
                blockedLane,
                laneSlack,
                forwardGap,
            }
        })
        .sort((a, b) => a.score - b.score)

    return candidates
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

    // Đang vung chân cho một cú đá khác.
    if (state.windup) return false

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

    // Phạt đền: chỉ được sút.
    const restartType = state.restart?.playerId === playerId ? state.restart.type : null

    if (restartType === 'penalty' && action !== 'shoot') {
        if (!isAI) ctx.onActionMessage('PENALTY: AIM WITH ARROWS · D TO SHOOT')
        return false
    }

    // Giao bóng (Phase 22): bắt buộc chuyền cho đồng đội, không được sút.
    // Không bấm hướng thì chuyền cho người đứng cạnh bóng.
    const isKickOff = restartType === 'kick-off'

    if (isKickOff && action === 'shoot') {
        if (!isAI) ctx.onActionMessage('KICK-OFF: PASS THE BALL · S / W / A')
        return false
    }

    const kickOffAuto =
        isKickOff && !options.aimInput && !options.receiverId && state.restart.partnerId

    if (kickOffAuto) {
        options = { ...options, receiverId: state.restart.partnerId }
    }

    // Thủ môn đang ôm bóng: ném tay (S/W) hoặc phát bóng bằng chân (A/D).
    if (state.keeperHands === playerId) {
        return startKeeperDistribution(ctx, playerId, item, player, action, isAI, options)
    }

    const attackDirection = attackDir(state, item.teamId)

    const direction = new THREE.Vector3(0, 0, attackDirection)

    const charge = options.power
    const isCharged = typeof charge === 'number'
    const aimInput = options.aimInput || null
    // FO4-style biến thể (tổ hợp phím, xem control.js → kickVariant):
    // 'finesse' ZD, 'chip' QD, 'trivela' CD, 'driven' ZS/ZW, 'lobbed' QW, 'whipped' ZA.
    const variant = options.variant || null
    let curl = null

    let power = 8
    let lift = 0.22
    let message = 'SHORT PASS'
    let passTarget = null
    let spaceReceiver = null

    if (action === 'pass' || action === 'through' || action === 'lob') {
        // Người chơi: ngắm theo phím mũi tên, không bấm thì theo hướng mặt.
        const aim = isCharged && !kickOffAuto
            ? {
                direction: aimInput
                    ? aimInput.clone().normalize()
                    : facingVector(player.rotation.y),
                power: charge,
                // Chọc khe không bấm hướng: chọn người chạy chỗ tốt nhất phía trước
                // (trong ~110° quanh hướng mặt) thay vì đá theo đúng hướng mặt.
                loose: !aimInput && action === 'through',
            }
            : null

        // options.clearance (AI): phá bóng lên phía trước, không cần người nhận.
        passTarget = options.clearance
            ? null
            : findPassTarget(ctx, playerId, action, aim, options.receiverId || null)

        let distance = passTarget?.distance || 10

        // Chọc khe vào khoảng trống chỉ khi người chơi bấm hướng lên phía trên;
        // không thì bỏ (trước đây W khi đang rê ngang/quay lưng thì bóng bị
        // chọc theo hướng mặt, không về đâu cả).
        const throughIntoSpaceOk =
            action !== 'through' ||
            (aimInput && aim.direction.z * attackDirection > 0.2)

        if (aim && (!passTarget || passTarget.outOfAim) && !throughIntoSpaceOk) {
            if (!isAI) ctx.onActionMessage('NO RUNNER FOR A THROUGH BALL')

            return false
        }

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
        } else if (!passTarget && item.role !== 'GK' && !options.clearance) {
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

        if (!passTarget && options.clearance && item.role !== 'GK') {
            // Hậu vệ phá bóng: lên phía trước, lệch ra biên gần nhất.
            direction.set(Math.sign(player.position.x || 1) * 0.45, 0, attackDirection).normalize()

            power = 19
            lift = 5.5
            message = 'CLEARANCE'
        } else if (!passTarget && item.role === 'GK') {
            // Không có đồng đội phù hợp: thủ môn phá bóng lên phía trước.
            direction.set(0, 0, attackDirection)

            power = 18
            lift = 3.8
            message = 'GOALKEEPER CLEARANCE'
        } else if (action === 'pass') {
            power = clamp(12 + distance * 0.38, 13, 20)
            lift = 0.02
            message = item.role === 'GK' ? 'GOALKEEPER PASS' : 'SHORT PASS'
        } else if (action === 'through') {
            power = clamp(14 + distance * 0.32, 15, 22)
            lift = 0.08
            message = 'THROUGH BALL'
        } else if (action === 'lob') {
            power = clamp(11 + distance * 0.2, 12, 16)
            lift = 4.5
            message = 'LOFTED PASS'
        }

        // Người chơi giữ phím lâu hơn → bóng đi căng hơn (×0.88 khi chạm nhẹ,
        // ×1.30 khi đầy thanh). Trước đây lực chuyền cho đồng đội chỉ tính theo
        // khoảng cách nên giữ đầy lực vẫn "chuyền lưng chừng".
        if (isCharged && !options.clearance && !isThrowIn) {
            const boost = 0.88 + charge * 0.42

            power = Math.min(power * boost, action === 'lob' ? 21 : 27)

            if (action === 'lob') lift *= 0.9 + charge * 0.25
        }

        if (passTarget || spaceReceiver) {
            if (variant === 'driven') {
                // ZS / ZW: chuyền căng sệt, nhanh hơn ~20% (khó khống chế hơn).
                power = Math.min(power * 1.2, 29)
                lift = 0
                message = action === 'through' ? 'DRIVEN THROUGH BALL' : 'DRIVEN PASS'
            } else if (variant === 'lobbed' && action === 'through') {
                // QW: chọc khe bổng qua đầu hậu vệ.
                power *= 0.72
                lift = 3.4 + (isCharged ? charge : 0.5) * 1.6
                message = 'LOBBED THROUGH BALL'
            } else if (variant === 'whipped' && action === 'lob') {
                // ZA: tạt căng, quỹ đạo thấp.
                power = Math.min(power * 1.2, 24)
                lift *= 0.62
                message = 'WHIPPED CROSS'
            }
        }
    } else if (action === 'shoot') {
        const goalZ = attackDirection * FIELD.lineZ

        const distanceToGoal = Math.abs(goalZ - player.position.z)

        // Phase 19: Finishing (gần) / Long shots (xa > 20m) quyết định độ
        // chính xác, Shot power quyết định lực sút. Mệt thì kém đi.
        const longRange = clamp((distanceToGoal - 16) / 10, 0, 1)
        const finishing = clamp(
            attr(item, 'finishing') * (1 - longRange) +
            attr(item, 'longShots') * longRange -
            fatiguePenalty(state, playerId),
            40,
            99,
        )
        const shotPower = attr(item, 'shotPower')

        // Cầu thủ dứt điểm tốt có độ lệch nhỏ hơn.
        const accuracy = (finishing - 40) / 59

        let targetX

        if (isCharged) {
            // Người chơi ngắm bằng phím: thành phần ngang (trục X) chọn góc.
            // Lực quá mạnh (>80%) hoặc sút quá xa thì dễ lệch.
            targetX = (aimInput ? aimInput.x : 0) * (variant === 'finesse' ? 2.95 : 3.1)

            // Phase 24: chỉ số thấp lệch nhiều hơn rõ rệt (constants.js → ACCURACY).
            const miss = 1 - accuracy
            const { longRange, overPower } = ACCURACY
            const spread =
                shotSpread(accuracy) +
                Math.max(0, charge - overPower.from) * overPower.perUnit * (overPower.min + overPower.max * miss) +
                Math.max(0, distanceToGoal - longRange.from) * (longRange.min + longRange.max * miss)
            // Sút xoáy ZD chính xác hơn, sút má ngoài CD nhỉnh hơn sút thường.
            const spreadScale =
                variant === 'finesse' ? 0.6 : variant === 'trivela' ? 0.85 : variant === 'chip' ? 1.6 : 1

            targetX += (Math.random() * 2 - 1) * spread * spreadScale
        } else {
            // AI: phần lớn cú sút đi vào khoảng giữa khung thành (trong tầm
            // thủ môn), chỉ thỉnh thoảng mới hiểm vào góc. Trước đây phân bố
            // đều theo chiều ngang nên rất nhiều cú sút sát cột.
            const spread = aiShotSpread(accuracy)
            targetX = (Math.random() + Math.random() - 1) * spread

            // Máy sút xoáy / má ngoài thì nhắm hẳn vào góc (xem carrierAI.js).
            if (variant === 'finesse') {
                targetX = -(Math.sign(player.position.x) || 1) * (2.2 + Math.random() * 0.9) +
                    (Math.random() * 2 - 1) * aiCornerError(accuracy)
            } else if (variant === 'trivela') {
                targetX = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 1.1) +
                    (Math.random() * 2 - 1) * aiCornerError(accuracy) * 1.2
            } else if (variant === 'chip') {
                targetX = (Math.random() * 2 - 1) * (1.2 + (1 - accuracy) * 1.5)
            }
        }

        direction.set(
            targetX - player.position.x,
            0,
            goalZ - player.position.z,
        ).normalize()

        if (isCharged) {
            // Lực giữ phím quyết định tốc độ (~23–35 m/s, trước đây 17–30 —
            // người chơi thấy sút "hơi nhẹ") và độ bổng. Trên 90% lực bóng có
            // thể vọt xà.
            power = 19 + charge * 12 + shotPower * 0.05
            // Phase 24: nguy cơ vọt xà khi giữ > 90% lực giảm theo Finishing +
            // Shot power; người dứt điểm kém có thêm độ bổng ngẫu nhiên.
            const powerSkill = skill01((finishing + shotPower) / 2)
            lift =
                0.5 +
                charge * 2 +
                distanceToGoal * 0.025 +
                Math.max(0, charge - 0.9) * 10 * Math.random() * 3.5 *
                    (ACCURACY.sky.min + (1 - powerSkill) * ACCURACY.sky.max) +
                Math.random() * shotLiftError(accuracy)
            message = charge > 0.9 ? 'POWER SHOT!' : 'SHOT!'

            if (variant === 'finesse') {
                // ZD: sút xoáy bằng lòng trong — chậm hơn, ít bổng, cong vào góc xa.
                power = 16 + charge * 8 + shotPower * 0.03
                lift = 0.7 + charge * 1.5 + distanceToGoal * 0.02
                message = 'FINESSE SHOT!'
            } else if (variant === 'chip') {
                // QD: sút lốp qua đầu thủ môn.
                power = clamp(8 + distanceToGoal * 0.3 + charge * 3, 10, 19)
                // Khó căn lực: lệch ±7% độ bổng → có quả vọt xà / rơi sớm.
                lift = (6.5 + charge * 3) * (1 + (Math.random() - 0.5) * 0.24 * (1.3 - accuracy * 0.6))
                message = 'CHIP SHOT!'
            } else if (variant === 'trivela') {
                // CD: sút má ngoài (trivela) — cong ra ngoài, lực gần như sút thường.
                power *= 0.96
                message = 'TRIVELA!'
            }

        } else {
            // AI: vận tốc thật 22–29 m/s, sút xa bổng hơn một chút.
            power = clamp(
                21 + shotPower * 0.08 + (distanceToGoal > 20 ? 1.5 : 0),
                24,
                31,
            )

            lift = clamp(1.2 + distanceToGoal * 0.06, 1.2, 3.2) + Math.random() * shotLiftError(accuracy)
            message = 'SHOT!'

            // Máy dùng các kiểu sút FO4 (carrierAI.js chọn variant).
            if (variant === 'finesse') {
                power = clamp(17 + shotPower * 0.07, 20, 25)
                lift = 0.9 + distanceToGoal * 0.02
            } else if (variant === 'chip') {
                const c = 0.45 + Math.random() * 0.2

                power = clamp(8 + distanceToGoal * 0.3 + c * 3, 10, 19)
                lift = (6.5 + c * 3) * (1 + (Math.random() - 0.5) * 0.24 * (1.3 - accuracy * 0.6))
            } else if (variant === 'trivela') {
                power *= 0.96
            } else if (variant === 'low') {
                lift = 0.2
                power += 1
            }
        }

        // Bóng xoáy: nhắm lệch ra rồi cong về đúng điểm đã chọn (finesse
        // cong từ ngoài vào, trivela cong từ trong ra). Thủ môn tính cả
        // độ cong khi đoán điểm bóng tới (goalkeeper.js).
        if (variant === 'finesse' || variant === 'trivela') {
            // Đường cong là một cung tròn: hướng đá lệch θ ra ngoài, bóng
            // quay dần 2θ theo quãng đường bay nên tới đúng điểm ngắm dù
            // bóng chậm lại.
            const side = Math.sign(targetX) || 1
            const length = Math.hypot(targetX - player.position.x, goalZ - player.position.z)
            const theta = clamp(Math.atan(clamp(length * 0.13, 1.2, 3.5) / length), 0.05, 0.2)
            const outward = variant === 'finesse' ? side : -side
            const baseX = (targetX - player.position.x) / length
            const baseZ = (goalZ - player.position.z) / length
            // Quay hướng đá theo chiều làm x lệch về phía `outward`.
            const sign = outward * Math.sign(baseZ || 1)
            const angle = -sign * theta

            direction.set(
                baseX * Math.cos(angle) - baseZ * Math.sin(angle),
                0,
                baseX * Math.sin(angle) + baseZ * Math.cos(angle),
            ).normalize()

            curl = { kappa: (sign * 2 * theta) / length, distance: length * 1.05, lateral: -outward }
        }

        if (restartType === 'free-kick') {
            // Sút phạt trực tiếp: bóng vồng qua hàng rào (cao ~2.1m ở cự ly
            // 9m) rồi đi xuống. Lực mạnh quá thì vọt xà.
            const c = isCharged ? charge : 0.3 + Math.random() * 0.45

            power = 17 + c * 7 + shotPower * 0.02
            // Người chơi: lực thấp (< ~35%) thì bóng không qua nổi hàng rào.
            // Máy: thỉnh thoảng đá thấp trúng hàng rào.
            lift = isCharged
                ? 4.9 + c * 2.1
                : 5.6 + c * 1.2 - (Math.random() < 0.2 ? 1 : 0)
            message = 'FREE KICK SHOT!'
        } else if (restartType === 'penalty') {
            // Phạt đền: sút căng, sát đất hoặc nửa tầm.
            if (!isCharged) {
                const corner = (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 1.7)

                direction.set(corner - player.position.x, 0, goalZ - player.position.z).normalize()
                power = 21 + Math.random() * 5
                lift = 0.6 + Math.random() * 1.6
            } else {
                power = Math.min(power, 28)
                lift = Math.min(lift, 0.4 + charge * 2.6)
            }

            message = 'PENALTY KICK!'
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

    // Phase 22: lực chuyền / sút mạnh hơn (constants.js → KICK_POWER).
    power *= kickPowerScale({
        action,
        variant,
        restartType,
        isThrowIn,
        clearance: Boolean(options.clearance) || message === 'GOALKEEPER CLEARANCE',
        isAI,
    })

    if ((action === 'pass' || action === 'through') && lift < 1) {
        power = Math.min(power, KICK_POWER.maxPass)
    }

    const animation = isThrowIn
        ? 'throw'
        : action === 'shoot'
            ? 'shoot'
            : action === 'lob'
                ? 'cross'
                : 'pass'

    return beginWindup(ctx, {
        playerId,
        item,
        player,
        action,
        animation,
        isThrowIn,
        isAI,
        message,
        direction,
        power,
        lift,
        passTarget,
        spaceReceiver,
        curl,
        variant,
    })
}

// ---- Phase 16: thủ môn phát bóng ----
// gkThrow: ném tay, bóng đi căng sệt/hơi bổng, chính xác (S/W).
// punt: thả bóng rồi đá vô-lê lên cao, đi xa (A/D).
function startKeeperDistribution(ctx, playerId, item, player, action, isAI, options) {
    const { state } = ctx
    const attackDirection = attackDir(state, item.teamId)
    const charge = options.power
    const isCharged = typeof charge === 'number'
    const aimInput = options.aimInput || null
    const isThrow = action === 'pass' || action === 'through'

    const aim = isCharged
        ? {
            direction: aimInput
                ? aimInput.clone().normalize()
                : facingVector(player.rotation.y),
            power: charge,
        }
        : null

    let passTarget = findPassTarget(ctx, playerId, isThrow ? 'pass' : 'lob', aim)

    if (passTarget?.outOfAim) passTarget = null

    // Phát bóng bằng chân là để đi xa: đồng đội quá gần thì phát dài lên trên.
    if (!isThrow && passTarget && passTarget.distance < 22) passTarget = null

    const direction = new THREE.Vector3(0, 0, attackDirection)
    let distance

    if (passTarget) {
        const target = passTarget.targetPosition

        direction.set(target.x - player.position.x, 0, target.z - player.position.z).normalize()
        distance = passTarget.distance
    } else {
        if (aim) direction.copy(aim.direction)

        // Không phát bóng ngược về phía khung thành nhà.
        if (direction.z * attackDirection < 0.25) {
            direction.z = attackDirection * 0.5
            direction.normalize()
        }

        distance = isThrow
            ? (aim ? 8 + charge * 18 : 16)
            : (aim ? 28 + charge * 26 : 42)
    }

    let power
    let lift
    let message

    if (isThrow) {
        power = clamp(9 + distance * 0.35, 10, 17)
        lift = clamp(1 + distance * 0.04, 1.2, 2.2)
        message = 'GOALKEEPER THROW'
    } else {
        lift = clamp(6 + distance * 0.08, 7, 11)
        const flight = (2 * lift) / 9.81
        power = clamp((distance / flight) * 0.85, 14, 26)
        message = 'GOALKEEPER PUNT'
    }

    power *= KICK_POWER.keeper

    return beginWindup(ctx, {
        playerId,
        item,
        player,
        action: isThrow ? 'pass' : 'lob',
        animation: isThrow ? 'gkThrow' : 'punt',
        isThrowIn: false,
        isAI,
        message,
        direction,
        power,
        lift,
        passTarget,
        spaceReceiver: null,
    })
}

// Vị trí bóng trong tay/chân trong lúc vung (offset theo hướng đá, độ cao)
// và lúc rời tay/chân.
const HOLD_SPOT = {
    throw: { offset: 0.12, y: 2.15, releaseOffset: 0.4, releaseY: 2.1 },
    gkThrow: { offset: 0.2, y: 1.75, releaseOffset: 0.6, releaseY: 1.85 },
    punt: { offset: 0.5, y: 0.85, releaseOffset: 0.9, releaseY: 0.7 },
    default: { offset: 0.7, y: 0.39, releaseOffset: 0.95, releaseY: 0.48 },
}

function holdSpot(animation) {
    return HOLD_SPOT[animation] || HOLD_SPOT.default
}

function beginWindup(ctx, params) {
    const { state } = ctx
    const {
        playerId, item, player, action, animation, isThrowIn, isAI, message,
        direction, power, lift, passTarget, spaceReceiver, curl = null, variant = null,
    } = params

    // Phase 19: độ chính xác chuyền bóng theo chỉ số (chuyền ngắn / dài /
    // tầm nhìn khi chọc khe, Kicking cho thủ môn phát bóng) và thể lực.
    // Bóng lệch một góc nhỏ và lực sai lệch chút ít; người nhận chạy đón theo
    // đường bóng thật (teamAI.js → updateReceiverRun).
    if (!isThrowIn && action !== 'shoot') {
        const skillKey =
            animation === 'punt' || animation === 'gkThrow'
                ? 'kicking'
                : action === 'lob'
                    ? 'longPassing'
                    : 'shortPassing'
        let skill = attr(item, skillKey)

        if (action === 'through') skill = skill * 0.5 + attr(item, 'vision') * 0.5

        skill -= fatiguePenalty(state, playerId)

        const sloppiness = 1 - skill01(skill)
        // Phase 24: chỉ số thấp lệch hướng / sai lực rõ hơn (ACCURACY.passAngle / passPower).
        const angleError = (Math.random() + Math.random() - 1) * passAngleError(sloppiness)
        const cos = Math.cos(angleError)
        const sin = Math.sin(angleError)
        const dx = direction.x * cos - direction.z * sin
        const dz = direction.x * sin + direction.z * cos

        direction.set(dx, 0, dz)
        params.power = power * (1 + (Math.random() * 2 - 1) * passPowerError(sloppiness))
    }

    // Quay người về hướng đá để animation đúng hướng.
    player.rotation.y = Math.atan2(direction.x, direction.z)

    // ---- Nhịp vung chân (wind-up) ----
    // Bóng chưa rời chân ngay: cầu thủ vung chân trong WINDUP giây rồi mới
    // chạm bóng (xem releaseKick). Animation trong Player.jsx chạm bóng đúng
    // thời điểm này. Trong lúc vung chân, cầu thủ đứng yên và vẫn có thể bị
    // tắc mất bóng.
    state.windup = {
        playerId,
        teamId: item.teamId,
        action,
        animation,
        isThrowIn,
        isAI,
        message,
        direction: { x: direction.x, z: direction.z },
        power: params.power,
        lift,
        passTarget: passTarget
            ? {
                receiverId: passTarget.item.id,
                x: passTarget.targetPosition.x,
                z: passTarget.targetPosition.z,
            }
            : null,
        spaceReceiver,
        curl,
        variant,
        time: KICK_WINDUP[animation],
    }

    // Bóng tự do: người đá "giữ" bóng trong nhịp vung chân.
    state.possession = playerId
    state.lastToucherId = playerId
    state.lastTouchTeam = item.teamId
    state.charge = null

    setPlayerAction(state, playerId, animation)

    return true
}

// Thời gian từ lúc bắt đầu vung chân đến lúc chạm bóng (giây).
// Phải khớp với điểm chạm trong các clip ở src/animation/clips.js.
export const KICK_WINDUP = {
    pass: 0.12,
    cross: 0.16,
    shoot: 0.18,
    throw: 0.22,
    gkThrow: 0.3,
    punt: 0.3,
}

// Gọi mỗi bước logic: giữ bóng trước chân trong lúc vung, rồi sút/chuyền.
export function updateWindup(ctx, dt) {
    const { state, objects } = ctx
    const windup = state.windup

    if (!windup) return

    const player = objects[windup.playerId]
    const ball = ctx.ballRef.current

    // Bị tắc mất bóng (hoặc bị thay ra) trong lúc vung chân → hủy.
    if (!player || !ball || state.possession !== windup.playerId) {
        state.windup = null
        return
    }

    windup.time -= dt

    if (windup.time > 0) {
        const spot = holdSpot(windup.animation)

        placeBall(
            ctx,
            player.position.x + windup.direction.x * spot.offset,
            player.position.z + windup.direction.z * spot.offset,
            spot.y,
        )
        return
    }

    state.windup = null
    releaseKick(ctx, windup)
}

function releaseKick(ctx, windup) {
    const { state, objects } = ctx
    const player = objects[windup.playerId]
    const ball = ctx.ballRef.current
    const { direction, isThrowIn, action, teamId, isAI } = windup
    let { power, lift } = windup
    const playerId = windup.playerId
    let message = windup.message

    // Bấm D lần nữa trong nhịp vung chân (DD): sút chìm căng sát đất.
    // Bấm A lần nữa khi tạt (AA): tạt sệt.
    if (windup.lowShot && action === 'shoot') {
        lift = 0.2
        power += 1.5
        message = 'LOW DRIVEN SHOT!'
    } else if (windup.lowCross && action === 'lob') {
        lift = Math.min(lift, 1.1)
        message = 'LOW CROSS'
    }

    const spot = holdSpot(windup.animation)
    const isKeeperRelease = windup.animation === 'gkThrow' || windup.animation === 'punt'

    ball.setTranslation(
        {
            x: player.position.x + direction.x * spot.releaseOffset,
            y: spot.releaseY,
            z: player.position.z + direction.z * spot.releaseOffset,
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
    // Phase 23: nhớ cú đá vừa rồi là gì (sút / chuyền) để xử lý bóng bật ra
    // khi cú sút trúng cầu thủ đối phương (updateShotBlock).
    state.lastKick = { kickId: state.kickId, action, teamId, playerId }
    state.lastUserKick = !isAI
        ? { kickId: state.kickId + 0, action, age: 0, low: Boolean(windup.lowShot || windup.lowCross) }
        : null
    state.curl = windup.curl && !windup.lowShot
        ? { kickId: state.kickId, ...windup.curl, travelled: 0 }
        : null
    state.possession = null
    state.lastTouchTeam = teamId
    state.lastToucherId = playerId

    // Thống kê: sút / chuyền (ném biên không tính).
    if (action === 'shoot') {
        recordTeam(state, teamId, 'shots')
        recordPlayer(state, playerId, 'shots')

        // Phase 21: xG + vị trí cú sút (bản đồ cú sút sau trận).
        const attack = attackDir(state, teamId)
        const depth = Math.max(0.5, FIELD.lineZ - player.position.z * attack)
        const lateral = player.position.x * attack
        const pressed = ctx.players.some(
            (other) =>
                other.teamId !== teamId &&
                objects[other.id] &&
                distance2D(objects[other.id].position, player.position) < 2,
        )

        recordShot(state, {
            teamId,
            playerId,
            depth,
            lateral,
            variant: windup.variant || null,
            xg: shotXg({
                lateral,
                depth,
                penalty: state.restart?.type === 'penalty',
                freeKick: state.restart?.type === 'free-kick',
                pressed,
            }),
        })
    } else if (!isThrowIn) {
        recordTeam(state, teamId, 'passes')
        recordPlayer(state, playerId, 'passes')
        openPass(state, teamId, playerId)

        if (state.stats) {
            state.stats.lastPasserId = playerId
            state.stats.lastPassTeam = teamId
        }
    }

    // Người vừa đá không được "đỡ" lại chính cú đá của mình. Trước đây
    // bóng vừa rời chân (cách ~1m) bị chính người đá khống chế lại ngay,
    // nên thủ môn cầm bóng mãi và đường chuyền có thể bật về chân người chuyền.
    state.pickupLocks[playerId] = isThrowIn || isKeeperRelease ? 1 : 0.4

    if (isKeeperRelease) {
        state.keeperHands = null
    }

    // Phase 20: ghi lại ai đang việt vị lúc bóng rời chân (không tính ném
    // biên, phát bóng lên, phạt góc), rồi kết thúc tình huống cố định.
    const restartType = state.restart?.type || null

    if (!isKeeperRelease && !['throw-in', 'goal-kick', 'corner'].includes(restartType)) {
        snapshotOffside(ctx, playerId, teamId, ball.translation())
    } else {
        state.offside = null
    }

    // Phạt đền: thủ môn đối phương "đoán" hướng ngay lúc bóng rời chân.
    if (restartType === 'penalty') {
        const roll = Math.random()

        state.penaltyKick = { kickId: state.kickId, guess: roll < 0.42 ? -1 : roll < 0.84 ? 1 : 0 }
    }

    state.restart = null

    // Ghi nhớ đồng đội đang được chuyền bóng tới.
    if (windup.passTarget) {
        state.pendingPass = {
            receiverId: windup.passTarget.receiverId,
            targetX: windup.passTarget.x,
            targetZ: windup.passTarget.z,
            action,
            elapsed: 0,
        }
    } else if (windup.spaceReceiver) {
        state.pendingPass = {
            receiverId: windup.spaceReceiver.id,
            targetX: windup.spaceReceiver.spot.x,
            targetZ: windup.spaceReceiver.spot.z,
            action,
            elapsed: 0,
        }
        message = 'PASS INTO SPACE'
    } else {
        state.pendingPass = null
    }

    // Người chơi vừa chuyền (FO4): chuyển điều khiển sang người nhận ngay khi
    // bóng rời chân. Người nhận vẫn tự chạy đón bóng cho tới khi người chơi
    // bấm hướng (phím mũi tên đang giữ để ngắm bị bỏ qua cho tới khi nhả ra,
    // xem control.js → steerLock).
    if (!isAI && !isKeeperRelease && teamId === 'blue' && state.pendingPass?.receiverId) {
        const receiverId = state.pendingPass.receiverId

        if (receiverId !== ctx.selectedId) {
            ctx.onSelect(receiverId)
            ctx.selectedId = receiverId
            state.steerLock = { id: receiverId, keys: heldArrows(ctx.keys), time: 0 }
        }
    }

    // Thủ môn BLUE vừa phát bóng: chuyển điều khiển sang người nhận
    // (hoặc cầu thủ gần điểm rơi nhất).
    if (isKeeperRelease && teamId === 'blue') {
        let nextId = state.pendingPass?.receiverId || null

        if (!nextId) {
            const spot = {
                x: player.position.x + direction.x * 20,
                z: player.position.z + direction.z * 20,
            }

            nextId = teamPlayers(ctx, 'blue')
                .filter((mate) => mate.role !== 'GK' && objects[mate.id])
                .sort(
                    (a, b) =>
                        distance2D(objects[a.id].position, spot) -
                        distance2D(objects[b.id].position, spot),
                )[0]?.id || null
        }

        if (nextId) {
            ctx.onSelect(nextId)
            ctx.selectedId = nextId
        }
    }

    if (!isAI) {
        ctx.onActionMessage(message)
    }
}

const PICKUP_REACH = 1.5   // đỡ bóng chậm / bóng của đội mình
const BLOCK_REACH = 0.9    // chặn bóng đang lăn của đối phương (đứng trên đường bóng)
const CONTROL_SPEED = 17   // đồng đội khống chế ngay bóng chậm hơn mức này (Phase 22: 15 → 17 vì chuyền mạnh hơn)
const MOVING_BALL = 3.5    // m/s: chậm hơn thế coi như bóng "chết", ai gần thì lấy

// Cầu thủ ở gần có thể đỡ/khống chế bóng tự do.
export function updateLooseBallPickup(ctx) {
    const { state, objects } = ctx
    const ball = ctx.ballRef.current

    if (state.possession || !ball) return

    const ballPosition = ball.translation()
    const velocity = ball.linvel()
    const ballSpeed = Math.hypot(velocity.x, velocity.y, velocity.z)
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z)

    // Bóng quá cao thì cầu thủ chưa thể khống chế bằng chân.
    if (ballPosition.y >= 1.55) return

    let best = null
    let bestScore = Infinity

    // Đội "đang chuyền": vẫn là đội đá cú bóng này dù đối phương vừa chạm làm
    // chậm bóng (lastTouchTeam lúc đó đổi sang đối phương để tính ném biên /
    // phạt góc đúng, nhưng không được đổi lợi thế tầm đỡ bóng).
    const reachTeam =
        state.deflection?.kickId === state.kickId ? state.deflection.kickerTeam : state.lastTouchTeam

    ctx.players.forEach((item) => {
        const object = objects[item.id]
        if (!object) return

        const distance = distance2D(object.position, ballPosition)

        // Tầm đỡ bóng (Phase 18). Người được chuyền tới và đồng đội đón bóng
        // trong 1.5m. Đối phương muốn chặn một quả bóng đang đi nhanh thì phải
        // đứng đúng trên đường bóng (0.85m): trước đây chỉ cần ở cách 1.5m là
        // "hút" được bóng, nên người áp sát luôn cắt được đường chuyền ngay
        // khi bóng vừa rời chân.
        const sameTeamAsKicker = item.teamId === reachTeam
        // Interceptions (Phase 19) nới tầm chặn bóng thêm tối đa 0.15m.
        const reach =
            sameTeamAsKicker || horizontalSpeed < MOVING_BALL
                ? PICKUP_REACH
                : BLOCK_REACH + skill01(attr(item, 'interceptions')) * 0.15

        if (distance > reach) return

        if (state.pickupLocks[item.id] > 0) return

        // Thủ môn đang xử lý cú sút bằng tay (goalkeeper.js): không đỡ bằng chân.
        const plan = state.keeperPlans?.[item.teamId]

        if (
            item.role === 'GK' &&
            plan &&
            !plan.resolved &&
            plan.kickId === state.kickId
        ) {
            return
        }

        // Phase 23: cú sút đang bay nhanh — đối phương (trừ thủ môn) không
        // khống chế được, bóng chạm người thì bật ra (updateShotBlock).
        if (
            item.teamId !== reachTeam &&
            item.role !== 'GK' &&
            isLiveShot(state, ballSpeed)
        ) {
            return
        }

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

    // Phase 20: người đang việt vị chạm bóng → thổi phạt.
    if (checkOffside(ctx, best.item)) return

    // Người được chuyền tới (hoặc đồng đội của người chuyền) khống chế được
    // ngay đường chuyền có tốc độ vừa phải. Đối phương chặn bóng nhanh thì
    // bóng chỉ bật ra chậm lại, phải tranh tiếp mới có bóng (Phase 18).
    // Ball control (Phase 19): khống chế gọn bóng tới 10–18 m/s.
    const controlSpeed =
        CONTROL_SPEED - 4 +
        skill01(attr(best.item, 'ballControl') - fatiguePenalty(state, best.item.id)) * 8
    const cleanControl =
        best.item.teamId === reachTeam && ballSpeed <= controlSpeed

    if (ballSpeed > 7.5 && !cleanControl) {
        // Chạm bước một: giảm tốc bóng trước khi kiểm soát. Đây cũng là một
        // lần chạm bóng (playtest 3: trước đây không ghi lại, nên bóng bật
        // ra ngoài sau pha chặn này bị tính cho đội đá trước đó → ném biên
        // / phát bóng sai đội).
        if (state.deflection?.kickId !== state.kickId) {
            state.deflection = { kickId: state.kickId, kickerTeam: reachTeam }
        }

        state.lastTouchTeam = best.item.teamId
        state.lastToucherId = best.item.id

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

    // Cắt đường chuyền của đối phương (Phase 17).
    const intendedReceiver = state.pendingPass
        ? getPlayer(ctx, state.pendingPass.receiverId)
        : null
    const intercepted =
        Boolean(intendedReceiver) && intendedReceiver.teamId !== best.item.teamId

    // Bóng đã đủ chậm: cầu thủ khống chế và nhận quyền sở hữu.
    attachBallToPlayer(ctx, best.object, best.item.id)

    if (intercepted) {
        recordTeam(state, best.item.teamId, 'interceptions')
        recordPlayer(state, best.item.id, 'interceptions')
    }

    // Như FO4: cầu thủ BLUE nhận bóng được chọn điều khiển ngay
    // (thủ môn vẫn để AI phát bóng).
    if (best.item.teamId === 'blue' && best.item.role !== 'GK') {
        ctx.onSelect(best.item.id)
        ctx.selectedId = best.item.id
    }

    const label = best.item.teamId === 'blue' ? ctx.userTeamName : ctx.opponentName

    ctx.onActionMessage(intercepted ? `${label} INTERCEPTION!` : `${label} FIRST TOUCH`)
}

// ---- Phase 23: cú sút trúng cầu thủ đối phương (không phải thủ môn) ----
// Trước đây bóng sút trúng hậu vệ chỉ bị giảm tốc 52% mỗi bước, nên chỉ sau
// 2–3 bước (≈0.05s) hậu vệ đã khống chế được: bóng như "dính" vào người.
// Giờ cú sút (hoặc bóng rất căng > 20 m/s) chạm thân người (cao < 1.95m,
// cách < 0.7m) thì bật ra: phản xạ theo hướng va chạm, mất 50–75% tốc độ,
// lệch ngẫu nhiên, nảy lên một chút. Người chặn bị khóa nhận bóng 0.45s nên
// bóng bật ra thành bóng tự do, hai đội cùng tranh.
const SHOT_BLOCK = {
    reach: 0.85,         // khoảng cách từ tâm người tới bóng (m), ≈ tầm chặn bóng BLOCK_REACH
    height: 1.95,        // cao hơn mức này thì bóng bay qua đầu
    minSpeed: 9,         // bóng chậm hơn thì xử lý như đỡ bóng bình thường
    hardBall: 24,        // bóng căng hơn mức này (chuyền căng, phá bóng — không phải sút) cũng bật ra
    keep: [0.25, 0.5],   // phần tốc độ còn lại sau khi bật ra
    jitter: 0.45,        // lệch hướng ngẫu nhiên (rad)
    lock: 0.45,          // người chặn chưa được nhận bóng trong chừng này giây
}

function isLiveShot(state, speed) {
    const kick = state.lastKick

    if (!kick || kick.kickId !== state.kickId) return false

    return speed >= SHOT_BLOCK.minSpeed && (kick.action === 'shoot' || speed >= SHOT_BLOCK.hardBall)
}

export function updateShotBlock(ctx) {
    const { state, objects } = ctx
    const ball = ctx.ballRef.current
    const kick = state.lastKick

    if (!ball || state.possession || !kick || kick.kickId !== state.kickId) return

    const velocity = ball.linvel()
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
    const isShot = kick.action === 'shoot'

    if (speed < SHOT_BLOCK.minSpeed || (!isShot && speed < SHOT_BLOCK.hardBall)) return

    const position = ball.translation()

    if (position.y > SHOT_BLOCK.height) return

    // Hàng rào đá phạt đã có xử lý riêng (referee.js → updateWallBlock).
    const wallIds = state.wall?.kickId === state.kickId ? state.wall.ids : []

    let blocker = null
    let blockerDistance = SHOT_BLOCK.reach

    ctx.players.forEach((item) => {
        if (item.teamId === kick.teamId || item.role === 'GK' || wallIds.includes(item.id)) return
        if (state.pickupLocks[item.id] > 0) return

        const object = objects[item.id]
        if (!object) return

        const distance = distance2D(object.position, position)

        if (distance < blockerDistance) {
            blocker = { item, object }
            blockerDistance = distance
        }
    })

    if (!blocker) return

    // Pháp tuyến va chạm: từ người tới bóng (mặt phẳng ngang).
    let nx = position.x - blocker.object.position.x
    let nz = position.z - blocker.object.position.z
    const length = Math.hypot(nx, nz)

    if (length < 0.05) {
        nx = -velocity.x
        nz = -velocity.z
    }

    const normalLength = Math.hypot(nx, nz) || 1
    nx /= normalLength
    nz /= normalLength

    const along = velocity.x * nx + velocity.z * nz

    // Bóng đang đi ra xa người (đã sượt qua) thì thôi.
    if (along > 0) return

    // Phản xạ qua pháp tuyến, rồi xoay lệch ngẫu nhiên và giảm tốc.
    let rx = velocity.x - 2 * along * nx
    let rz = velocity.z - 2 * along * nz
    const angle = (Math.random() * 2 - 1) * SHOT_BLOCK.jitter
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const keep = SHOT_BLOCK.keep[0] + Math.random() * (SHOT_BLOCK.keep[1] - SHOT_BLOCK.keep[0])

    ;[rx, rz] = [rx * cos - rz * sin, rx * sin + rz * cos]

    ball.setTranslation(
        {
            x: blocker.object.position.x + nx * (SHOT_BLOCK.reach + 0.05),
            y: Math.max(0.39, position.y),
            z: blocker.object.position.z + nz * (SHOT_BLOCK.reach + 0.05),
        },
        true,
    )
    ball.setLinvel(
        {
            x: rx * keep,
            y: Math.max(0.6, Math.abs(velocity.y) * 0.3) + Math.random() * 2.2,
            z: rz * keep,
        },
        true,
    )
    ball.setAngvel({ x: 0, y: 0, z: 0 }, true)

    // Như thủ môn đẩy bóng: tính là một lần chạm mới (thủ môn, bóng xoáy, đường
    // chuyền đang mở đều bỏ cú đá cũ), người chạm cuối là người chặn (để
    // tính phạt góc / ném biên đúng đội).
    state.kickId += 1
    state.lastKick = { kickId: state.kickId, action: 'block', teamId: blocker.item.teamId, playerId: blocker.item.id }
    state.lastTouchTeam = blocker.item.teamId
    state.lastToucherId = blocker.item.id
    state.pendingPass = null
    state.curl = null
    state.deflection = null
    state.pickupLocks[blocker.item.id] = SHOT_BLOCK.lock

    if (isShot) {
        recordTeam(state, blocker.item.teamId, 'blocks')
        recordPlayer(state, blocker.item.id, 'blocks')
    }

    const label = blocker.item.teamId === 'blue' ? ctx.userTeamName : ctx.opponentName

    ctx.onActionMessage(isShot ? `BLOCKED BY ${label}!` : `${label} DEFLECTION`)
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

    // Đang vung chân: updateWindup giữ bóng.
    if (state.windup?.playerId === ownerId) return

    // Thủ môn ôm bóng trước ngực.
    if (state.keeperHands === ownerId) {
        const facing = facingVector(owner.rotation.y)

        ball.setTranslation(
            {
                x: owner.position.x + facing.x * 0.38,
                y: 1.15,
                z: owner.position.z + facing.z * 0.38,
            },
            true,
        )
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
        return
    }

    // Che bóng (Phase 17): bóng nằm sát chân ở phía xa đối thủ, không có
    // nhịp chạm nên không bị "lộ" bóng. Bóng trượt dần về vị trí che.
    if (state.shieldingId === ownerId) {
        const facing = facingVector(owner.rotation.y)
        const current = ball.translation()
        const targetX = owner.position.x + facing.x * 0.62
        const targetZ = owner.position.z + facing.z * 0.62
        const gapX = targetX - current.x
        const gapZ = targetZ - current.z
        const gap = Math.hypot(gapX, gapZ)
        const step = Math.min(gap, 7 * dt)

        ball.setTranslation(
            {
                x: gap > 0.001 ? current.x + (gapX / gap) * step : targetX,
                y: 0.39,
                z: gap > 0.001 ? current.z + (gapZ / gap) * step : targetZ,
            },
            true,
        )
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
        state.dribble.touchTimer = 0
        return
    }

    // Đang chờ đá phạt / phạt góc / phát bóng / phạt đền: bóng nằm yên tại chỗ.
    if (state.restart && state.restart.type !== 'throw-in' && state.restart.playerId === ownerId) {
        ball.setTranslation({ x: state.restart.ballX, y: 0.39, z: state.restart.ballZ }, true)
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
        return
    }

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

    // (Đã bỏ: trước đây đối thủ chỉ cần đứng sát quả bóng lúc bóng xa chân
    // người rê là tự cướp được bóng. Theo yêu cầu playtest, bóng chỉ đổi chủ
    // khi có động tác tắc / xoạc (người chơi bấm Space / A, máy tự quyết định
    // trong teamAI.js → updateAISteal), khi người rê chạm bóng quá mạnh
    // (bóng thành bóng tự do) hoặc khi đường chuyền bị cắt.)

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

    // Rê thường (không nước rút): giữ bóng sát chân. Nếu bóng đang chạy xa
    // dần (người rê bị tì vai chậm lại, đổi hướng...) thì hãm bóng mạnh hơn.
    const ballSpeedNow = Math.hypot(velocity.x, velocity.z)
    const keepClose =
        !sprinting && distance > 0.85 && ballSpeedNow > speed
            ? Math.exp(-7 * dt)
            : 1

    ball.setLinvel(
        {
            x: velocity.x * damp * keepClose,
            y: velocity.y,
            z: velocity.z * damp * keepClose,
        },
        true,
    )

    // Chỉ chạm được khi bóng đã về gần chân (theo hướng chạy).
    // Khi đổi hướng, "ahead" theo hướng mới nhỏ → chạm để kéo bóng theo.
    const ahead = dx * moveX + dz * moveZ

    // Bóng không nằm phía trước (vừa nhận bóng rồi quay người): với xa hơn
    // một chút để kéo bóng theo.
    const reach = ahead < 0.2 ? DRIBBLE.touchReach + 0.5 : DRIBBLE.touchReach

    const needsTouch =
        state.dribble.touchTimer <= 0 &&
        distance < reach &&
        ahead < DRIBBLE.footOffset

    if (!needsTouch) return

    // Kỹ năng rê bóng càng cao, hướng chạm càng chuẩn.
    // Phase 19: Ball control + Agility, trừ khi mệt.
    const dribbleSkill =
        attr(item, 'ballControl') * 0.6 + attr(item, 'agility') * 0.4 - fatiguePenalty(state, ownerId)
    const skill = clamp((dribbleSkill - 50) / 45, 0, 1)
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

// Bóng xoáy (ZD / CD): gia tốc ngang trong lúc bóng bay, tới khi có người chạm
// bóng hoặc hết thời gian bay dự kiến. Gọi mỗi bước logic.
export function updateCurl(ctx, dt) {
    const { state } = ctx

    if (state.lastUserKick) state.lastUserKick.age += dt

    const curl = state.curl
    const ball = ctx.ballRef.current

    if (!curl || !ball) return

    if (curl.kickId !== state.kickId || state.possession || curl.travelled >= curl.distance) {
        state.curl = null
        return
    }

    const velocity = ball.linvel()
    const step = Math.hypot(velocity.x, velocity.z) * dt
    const angle = curl.kappa * step
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    curl.travelled += step

    ball.setLinvel(
        { x: velocity.x * cos - velocity.z * sin, y: velocity.y, z: velocity.x * sin + velocity.z * cos },
        true,
    )
}

// Độ lệch ngang (m, theo trục x) của bóng xoáy sau quãng đường d tính từ lúc
// đá — thủ môn dùng để đoán điểm bóng tới.
export function curlOffset(curl, travelledNow, extra) {
    if (!curl) return 0

    const kappa = Math.abs(curl.kappa)
    const lateral = (d) => {
        const inside = Math.min(d, curl.distance)

        return kappa * inside * inside * 0.5 + kappa * curl.distance * Math.max(0, d - curl.distance)
    }

    return curl.lateral * (lateral(travelledNow + extra) - lateral(travelledNow) - kappa * Math.min(travelledNow, curl.distance) * extra)
}

// DD / AA bấm hơi muộn (ngay sau khi bóng rời chân, ≤ 0.15s): vẫn tính, chỉnh
// lại quỹ đạo bóng vừa đá thành sút chìm / tạt sệt.
export function applyLateTap(ctx, action) {
    const { state } = ctx
    const last = state.lastUserKick
    const ball = ctx.ballRef.current

    if (!last || !ball || last.low || last.age > 0.15 || last.kickId !== state.kickId || state.possession) return false
    if (last.action !== action || (action !== 'shoot' && action !== 'lob')) return false

    const velocity = ball.linvel()

    last.low = true

    if (action === 'shoot') {
        ball.setLinvel({ x: velocity.x * 1.06, y: Math.min(velocity.y, 0.2), z: velocity.z * 1.06 }, true)
        state.curl = null
        ctx.onActionMessage('LOW DRIVEN SHOT!')
    } else {
        ball.setLinvel({ x: velocity.x, y: Math.min(velocity.y, 1.1), z: velocity.z }, true)
        ctx.onActionMessage('LOW CROSS')
    }

    return true
}
