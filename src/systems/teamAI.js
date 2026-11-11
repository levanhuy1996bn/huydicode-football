import {
    FIELD,
    clamp,
    distance2D,
} from './constants'
import { judgeChallenge } from './referee'
import { attackDir, homePosition } from './matchState'
import { attachBallToPlayer, findPassTarget, getPlayer, teamPlayers } from './ball'
import { moveAIPlayer, topSpeedOf } from './movement'
import { isPlayerLocked, setPlayerAction } from './playerState'
import { recordPlayer, recordTeam } from './matchStats'
import { CLEAN_TACKLE_RATE, isShielding, pokeBallLoose } from './duels'
import { isCounterPressing, teamTactic } from './tactics'
import { attr, skill01 } from './attributes'
import { fatiguePenalty } from './stamina'

// ---- Phase 18: di chuyển không bóng theo chiến thuật ----
//
// Mỗi đội chơi theo "khối": ba tuyến (thủ – giữa – công) giữ cự ly với nhau
// và trượt theo bóng, thay vì mỗi người tự bám vị trí gốc.
//
// Có bóng:
//   - hàng thủ dâng theo bóng (cao/thấp tùy defensiveLine), hậu vệ biên chồng
//     biên khi chiến thuật tấn công;
//   - tiền vệ: một người lùi làm chỗ dựa phía sau bóng, những người còn lại
//     dâng ngang/qua bóng;
//   - tiền đạo đứng ngang hậu vệ cuối cùng của đối phương (không vượt qua),
//     cánh giữ độ rộng, bóng vào 1/3 cuối sân thì xâm nhập vòng cấm;
//   - hai người gần bóng nhất "xin bóng": lại gần 6–15m và né khỏi người chắn.
// Mất bóng:
//   - hàng thủ luôn ở giữa bóng và khung thành, tiền vệ cách hàng thủ ~10m,
//     cả khối bó vào trong và trượt về phía có bóng;
//   - hậu vệ / tiền vệ kèm người phía khung thành nhà;
//   - áp sát: 1–3 người tùy `press` (người 1 lao vào bóng, người 2 bọc lót
//     phía sau, người 3 chặn đường chuyền gần nhất);
//   - vây ráp ngay sau khi mất bóng trong `counterPress` giây.
// Bóng tự do: người gần nhất đón đầu bóng, một người cắt đường chuyền
// (Phase 17), còn lại giữ khối.
//
// `snapshot` = { ballPoint, ownerId, ownerItem } chụp ở đầu bước logic.
export function updateTeamAI(ctx, teamId, snapshot, dt) {
    const { state, objects } = ctx
    const { ballPoint, ownerId, ownerItem } = snapshot

    const tactic = teamTactic(ctx, teamId)
    const teamList = teamPlayers(ctx, teamId)
    const direction = attackDir(state, teamId)
    const enemyTeamId = teamId === 'blue' ? 'red' : 'blue'

    const teamHasBall = ownerItem?.teamId === teamId
    const enemyHasBall = Boolean(ownerItem) && !teamHasBall

    const isUserControlled = (item) =>
        teamId === 'blue' && item.id === ctx.selectedId

    const ball = ctx.ballRef.current
    const ballVelocity = ball ? ball.linvel() : { x: 0, y: 0, z: 0 }
    const ballSpeed = Math.hypot(ballVelocity.x, ballVelocity.z)
    const ballA = ballPoint.z * direction
    const ballX = ballPoint.x

    // Bóng tự do: coi như đang tấn công nếu đội mình chạm bóng cuối.
    const attacking = teamHasBall || (!ownerItem && state.lastTouchTeam === teamId)

    // ---- Dữ liệu chung của đội ----
    const outfield = teamList
        .filter((item) => item.role !== 'GK' && objects[item.id])
        .map((item) => {
            const home = homePosition(state, item)

            return {
                item,
                object: objects[item.id],
                homeX: home.x,
                homeA: home.z * direction,
                distance: distance2D(objects[item.id].position, ballPoint),
            }
        })

    const lineHome = (role) => {
        const list = outfield.filter((entry) => entry.item.role === role)

        return list.length
            ? list.reduce((sum, entry) => sum + entry.homeA, 0) / list.length
            : 0
    }

    const dfHome = lineHome('DF')

    const opponents = teamPlayers(ctx, enemyTeamId)
        .filter((item) => objects[item.id])
        .map((item) => ({
            item,
            x: objects[item.id].position.x,
            z: objects[item.id].position.z,
            a: objects[item.id].position.z * direction,
        }))

    // "Vạch việt vị": hậu vệ đứng thấp nhất của đối phương (không tính thủ môn).
    const enemyOutfieldA = opponents
        .filter((opponent) => opponent.item.role !== 'GK')
        .map((opponent) => opponent.a)
        .sort((a, b) => b - a)
    const offsideA = Math.min(46, enemyOutfieldA[0] ?? 40)

    // ---- Áp sát ----
    const pressers = outfield
        .filter((entry) => !isUserControlled(entry.item) && entry.item.id !== ownerId)
        .sort((a, b) => a.distance - b.distance)

    const counterPressing = enemyHasBall && isCounterPressing(ctx, teamId)
    // Bóng đã vào 1/3 sân nhà: đội nào cũng phải có 2 người ra chặn, kể cả
    // khi chiến thuật ít áp sát (lùi sâu nhưng không để đối thủ sút thoải mái).
    const protectingBox = ballA < -20
    const pressCount = counterPressing
        ? 3
        : tactic.press < 0.35
            ? (protectingBox ? 2 : 1)
            : tactic.press < 0.85
                ? 2
                : 3
    const closeDownRadius = counterPressing
        ? 24
        : Math.max(10 + tactic.press * 14, protectingBox ? 18 : 0)

    // Giữ W khi đối thủ có bóng: gọi đồng đội gần nhất vào áp sát (FO4).
    // (Trước đây là A; A giờ là xoạc bóng.)
    const teamPressCalled =
        teamId === 'blue' && enemyHasBall && Boolean(ctx.keys?.current?.KeyW)

    const carrierObject = ownerId ? objects[ownerId] : null
    const carrierShielding = enemyHasBall && isShielding(state, ownerId)
    const ownGoal = { x: 0, z: -direction * FIELD.lineZ }

    const pressTargets = new Map()

    // Thủ môn (của bất kỳ đội nào) đang ôm bóng trong tay — hoặc chờ phát bóng
    // lên (Phase 20): đội đó dạt ra nhận bóng, đối phương lùi ra ngoài vòng cấm.
    const keeperHolding =
        Boolean(ownerId) &&
        (state.keeperHands === ownerId ||
            (state.restart?.type === 'goal-kick' && state.restart.playerId === ownerId))

    if (enemyHasBall && carrierObject && !state.restart && !keeperHolding) {
        const toGoalX = ownGoal.x - carrierObject.position.x
        const toGoalZ = ownGoal.z - carrierObject.position.z
        const toGoalLength = Math.hypot(toGoalX, toGoalZ) || 1
        const goalSide = (gap) => ({
            x: carrierObject.position.x + (toGoalX / toGoalLength) * gap,
            z: carrierObject.position.z + (toGoalZ / toGoalLength) * gap,
        })

        const first = pressers[0]

        if (first && (teamPressCalled || first.distance < closeDownRadius)) {
            // Áp sát kiểu "jockey" (sửa lỗi playtest: đối thủ áp sát quá
            // nhanh): chạy nhanh tới điểm chắn phía khung thành của người cầm
            // bóng, còn cách ~6m thì chậm lại, đứng chắn cách ~1.2m và chờ thời
            // cơ tắc bóng (updateAISteal), thay vì lao thẳng vào chân.
            const eager = teamPressCalled || counterPressing
            const close = first.distance < 6
            const spot = goalSide(close ? 1.2 : 1.6)

            pressTargets.set(first.item.id, {
                x: spot.x,
                z: spot.z,
                speed: close ? (eager ? 0.78 : 0.62) : eager ? 1.15 : 1.05,
            })
        }

        const second = pressers[1]

        if (second && pressCount >= 2 && second.distance < closeDownRadius + 4) {
            // Bọc lót phía sau người áp sát; nếu đối thủ che bóng thì vào lấy bóng.
            const cover = carrierShielding ? ballPoint : goalSide(3.5)

            pressTargets.set(second.item.id, { x: cover.x, z: cover.z, speed: 1.2 })
        }

        const third = pressers[2]

        // Người thứ ba chỉ tham gia khi bóng còn ở nửa sân đối phương / giữa sân
        // (dâng cả ba người ở sân nhà sẽ hở khung thành).
        if (third && pressCount >= 3 && ballA > -12 && third.distance < closeDownRadius) {
            // Chặn đường chuyền tới đồng đội gần người cầm bóng nhất.
            const option = opponents
                .filter((opponent) => opponent.item.id !== ownerId && opponent.item.role !== 'GK')
                .sort(
                    (a, b) =>
                        distance2D(a, carrierObject.position) -
                        distance2D(b, carrierObject.position),
                )[0]

            if (option) {
                pressTargets.set(third.item.id, {
                    x: carrierObject.position.x + (option.x - carrierObject.position.x) * 0.7,
                    z: carrierObject.position.z + (option.z - carrierObject.position.z) * 0.7,
                    speed: 1.2,
                })
            }
        }
    }

    // ---- Thu hồi bóng tự do (Phase 17) ----
    const intercept =
        !ownerItem && state.pendingPass && state.lastTouchTeam !== teamId
            ? findInterceptor(ctx, teamList, isUserControlled, ballPoint, ballSpeed)
            : null
    const chaseId = !ownerItem && pressers[0] ? pressers[0].item.id : null
    const secondChaseId = !ownerItem && pressers[1] ? pressers[1].item.id : null

    // ---- Khối phòng ngự ----
    const dl = tactic.defensiveLine
    let defLineA = clamp(ballA - (14 + (1 - dl) * 14), -41, -12 + dl * 18)

    // Hàng thủ không bao giờ đứng cao hơn bóng.
    if (ballA - 3 < defLineA) defLineA = Math.max(-44, ballA - 3)

    const mfLineA = Math.min(defLineA + 12, Math.max(defLineA + 5, ballA - 2))
    const compactX = 0.78 * tactic.width

    // Kèm người: cầu thủ đối phương (không cầm bóng) đang ở vùng nguy hiểm.
    const marks = new Map()

    if (!attacking && !keeperHolding) {
        const threats = opponents
            .filter(
                (opponent) =>
                    opponent.item.id !== ownerId &&
                    opponent.item.role !== 'GK' &&
                    opponent.a < defLineA + 8,
            )
            .sort((a, b) => a.a - b.a)

        // Chỉ hậu vệ kèm người; tiền vệ giữ cự ly đội hình (kèm khu vực).
        const markers = outfield.filter(
            (entry) =>
                entry.item.role === 'DF' &&
                !isUserControlled(entry.item) &&
                !pressTargets.has(entry.item.id),
        )
        const taken = new Set()

        threats.forEach((threat) => {
            let best = null

            markers.forEach((entry) => {
                if (taken.has(entry.item.id)) return

                const distance = distance2D(entry.object.position, threat)
                const cost = distance

                if (distance < 9 && (!best || cost < best.cost)) {
                    best = { entry, cost }
                }
            })

            if (!best) return

            taken.add(best.entry.item.id)

            const toGoalX = ownGoal.x - threat.x
            const toGoalZ = ownGoal.z - threat.z
            const length = Math.hypot(toGoalX, toGoalZ) || 1

            marks.set(best.entry.item.id, {
                x: threat.x + (toGoalX / length) * 1.5,
                z: threat.z + (toGoalZ / length) * 1.5,
            })
        })
    }

    // ---- Khối tấn công ----
    const push = tactic.attack
    const attackLineA = clamp(ballA - (16 + (1 - dl) * 10), -40, 8)
    const finalThird = ballA > 28

    // Người cầm bóng của đội mình chưa bị ai áp sát (≥ 3.5m).
    const carrierFree =
        teamHasBall &&
        carrierObject &&
        !opponents.some(
            (opponent) => distance2D(opponent, carrierObject.position) < 3.5,
        )

    // Hai người gần bóng nhất lại gần xin bóng.
    const supporters = new Set(
        teamHasBall && !keeperHolding
            ? pressers.slice(0, 2).map((entry) => entry.item.id)
            : [],
    )

    outfield.forEach((entry) => {
        const { item, object, homeX, homeA } = entry

        if (isUserControlled(item)) return

        // Người cầm bóng do carrierAI.js điều khiển.
        if (item.id === ownerId) return

        // Người đang đón đường chuyền do updateReceiverRun điều khiển (nếu cả
        // hai cùng điều khiển, hai lệnh di chuyển triệt tiêu nhau).
        if (state.pendingPass?.receiverId === item.id) return
        if (state.prePassReceiver === item.id) return

        const role = item.role
        const wide = Math.abs(homeX) > 14
        const side = Math.sign(homeX) || 1

        let targetX = homeX
        let targetA = homeA
        let speedScale = 1.05

        const press = pressTargets.get(item.id)

        if (press) {
            targetX = press.x
            targetA = press.z * direction
            speedScale = press.speed
        } else if (intercept && intercept.id === item.id) {
            targetX = intercept.x
            targetA = intercept.z * direction
            speedScale = INTERCEPT_SPEED
        } else if (item.id === chaseId) {
            // Đón đầu bóng đang lăn thay vì chạy theo sau nó.
            const lead = clamp(entry.distance / 9, 0, 0.8)

            targetX = ballPoint.x + ballVelocity.x * lead
            targetA = (ballPoint.z + ballVelocity.z * lead) * direction
            speedScale = 1.32
        } else if (item.id === secondChaseId && entry.distance < 14) {
            targetX = ballPoint.x
            targetA = ballA
            speedScale = 1.2
        } else if (teamHasBall && keeperHolding) {
            // Thủ môn đội mình ôm bóng: dạt ra hai bên tạo chỗ nhận bóng.
            const sideX = Math.sign(homeX) || (item.id.charCodeAt(item.id.length - 1) % 2 ? 1 : -1)

            if (role === 'DF') {
                targetX = wide ? sideX * 27 * tactic.width : sideX * 14
                targetA = wide ? -30 : -40
            } else if (role === 'MF') {
                targetX = Math.abs(homeX) < 5 ? 0 : homeX * tactic.width
                targetA = Math.abs(homeX) < 5 ? -26 : -12
            } else {
                targetX = homeX * 0.9
                targetA = 5 + push * 10
            }

            speedScale = 1.05
        } else if (attacking) {
            if (role === 'DF') {
                targetA = attackLineA + (homeA - dfHome)

                if (wide) {
                    const sameSide = Math.sign(ballX) === side || Math.abs(ballX) < 6

                    if (push > 0.55 && ballA > -8 && sameSide) {
                        // Hậu vệ biên chồng biên.
                        targetA = clamp(ballA + 3, attackLineA, 34)
                        targetX = side * 26 * tactic.width
                        speedScale = 1.2
                    } else {
                        targetA += 3 * push
                        targetX = clamp(homeX * tactic.width, -29, 29)
                    }
                } else {
                    targetX = homeX * 0.9 + ballX * 0.12
                }
            } else if (role === 'MF') {
                if (Math.abs(homeX) < 5) {
                    // Tiền vệ trụ: chỗ dựa phía sau bóng.
                    targetA = ballA - 8 + push * 4
                    targetX = ballX * 0.4
                } else {
                    targetA = ballA + 5 + push * 8
                    targetX = homeX * 1.05 * tactic.width + ballX * 0.2
                }

                targetA = clamp(targetA, attackLineA + 6, Math.max(attackLineA + 6, offsideA - 2))
                speedScale = 1.12
            } else {
                // Đứng ngang hậu vệ cuối cùng của đối phương để kéo giãn hàng thủ,
                // nhưng không cách bóng quá 32m.
                targetA = clamp(offsideA - 0.6, ballA + 8, Math.max(ballA + 8, ballA + 32))

                // Người cầm bóng đang rảnh chân và trong tầm chuyền: chạy chỗ
                // ra sau lưng hàng thủ để đón đường chọc khe (trừng phạt hàng
                // thủ dâng cao).
                // Phase 20: có luật việt vị → đứng sát vạch (không vượt), bứt
                // tốc khi bóng được chọc khe (updateReceiverRun).
                if (carrierFree && offsideA - ballA < 30) {
                    targetA = offsideA - 0.4
                    speedScale = 1.25
                }

                targetA = Math.min(targetA, 46)

                if (wide) {
                    targetX = side * 21 * tactic.width

                    // Bóng ở cánh bên kia trong 1/3 cuối sân: băng vào cột xa.
                    if (finalThird && Math.sign(ballX) !== side && Math.abs(ballX) > 8) {
                        targetX = side * 6
                        targetA = clamp(offsideA - 0.6, 38, 46)
                    }
                } else {
                    targetX = clamp(ballX * 0.35, -8, 8)

                    if (finalThird) {
                        // Vào vòng cấm chờ tạt bóng / chọc khe.
                        targetX = clamp(ballX * 0.2, -5, 5)
                        targetA = clamp(offsideA - 0.6, 38, 46)
                    }
                }

                speedScale = Math.max(speedScale, 1.18)
            }

            // Phase 20: tiền vệ / tiền đạo không đứng vượt vạch việt vị (trừ khi
            // đứng sau bóng — bóng ở sát đường biên ngang khi phạt góc).
            if (role !== 'DF') {
                targetA = Math.min(targetA, Math.max(offsideA, ballA) - 0.5)
            }

            if (supporters.has(item.id) && carrierObject) {
                const adjusted = supportSpot(
                    state,
                    item.id,
                    carrierObject.position,
                    { x: targetX, z: targetA * direction },
                    opponents,
                    dt,
                )

                targetX = adjusted.x
                targetA = adjusted.z * direction
                speedScale = Math.max(speedScale, 1.15)
            }
        } else {
            // Phòng ngự theo khối.
            if (role === 'DF') {
                targetA = defLineA + (homeA - dfHome) * 0.5
                targetX = homeX * compactX + ballX * 0.3

                // Lùi sát vòng cấm thì bó hẹp lại che khung thành.
                if (defLineA < -34) targetX *= 0.82
            } else if (role === 'MF') {
                targetA = mfLineA + (Math.abs(homeX) < 5 ? -1.5 : 0)
                targetX = homeX * compactX + ballX * 0.35
            } else {
                // Tiền đạo ở lại phía trên làm điểm đến cho phản công.
                targetA = mfLineA + 11 + tactic.attack * 6
                targetX = homeX * 0.8 + ballX * 0.15
            }

            const mark = marks.get(item.id)

            if (mark) {
                // Marking tốt → bám người sát hơn.
                const weight = 0.42 + skill01(attr(item, 'marking')) * 0.3

                targetX += (mark.x - targetX) * weight
                targetA += (mark.z * direction - targetA) * weight
            }

            // Đang ở phía trên vị trí cần về: chạy lùi nhanh.
            const currentA = object.position.z * direction

            speedScale = currentA - targetA > 6 ? 1.28 : 1.08
        }

        // Đối phương ôm bóng trong tay: lùi ra ngoài vòng cấm và cách thủ môn
        // ít nhất 14m (trước đây người áp sát đứng sát thủ môn nên không phát
        // bóng được).
        if (enemyHasBall && keeperHolding && carrierObject) {
            targetA = Math.min(targetA, 33)

            const keeperX = carrierObject.position.x
            const keeperA = carrierObject.position.z * direction
            const gapX = targetX - keeperX
            const gapA = targetA - keeperA
            const gap = Math.hypot(gapX, gapA)

            if (gap < 14) {
                const scale = 14 / (gap || 1)

                targetX = keeperX + (gap ? gapX : 0) * scale
                targetA = keeperA + (gap ? gapA : -14) * scale
            }
        }

        const targetXClamped = clamp(targetX, FIELD.minX + 2, FIELD.maxX - 2)
        const targetZ = clamp(targetA * direction, FIELD.minZ + 2, FIELD.maxZ - 2)

        const gap = Math.hypot(
            targetXClamped - object.position.x,
            targetZ - object.position.z,
        )

        // Gần tới vị trí thì chậm lại và quay mặt về phía bóng (đỡ giật).
        if (gap < 0.6) {
            object.rotation.y = Math.atan2(
                ballPoint.x - object.position.x,
                ballPoint.z - object.position.z,
            )
            return
        }

        moveAIPlayer(
            ctx,
            item,
            { x: targetXClamped, z: targetZ },
            gap < 2 ? Math.min(speedScale, 0.8) : speedScale,
            dt,
        )
    })
}

// Vị trí "xin bóng" của người hỗ trợ: cách người cầm bóng 6–15m và không có
// đối thủ đứng chắn trên đường chuyền. Độ lệch né người được giữ ~0.4 giây
// để cầu thủ không lắc qua lắc lại.
function supportSpot(state, playerId, carrier, target, opponents, dt) {
    let dx = target.x - carrier.x
    let dz = target.z - carrier.z
    let distance = Math.hypot(dx, dz) || 1

    if (distance > 15) {
        dx *= 15 / distance
        dz *= 15 / distance
        distance = 15
    } else if (distance < 6) {
        dx *= 6 / distance
        dz *= 6 / distance
        distance = 6
    }

    if (!state.supportMemo) state.supportMemo = {}

    let memo = state.supportMemo[playerId]

    if (!memo) {
        memo = state.supportMemo[playerId] = { time: 0, side: 0 }
    }

    memo.time -= dt

    if (memo.time <= 0) {
        memo.time = 0.4
        memo.side = 0

        // Đối thủ gần đường chuyền nhất.
        let blocker = null

        opponents.forEach((opponent) => {
            const relX = opponent.x - carrier.x
            const relZ = opponent.z - carrier.z
            const along = (relX * dx + relZ * dz) / distance

            if (along < 1 || along > distance + 1.5) return

            const cross = (relX * dz - relZ * dx) / distance

            if (Math.abs(cross) < 2.4 && (!blocker || Math.abs(cross) < Math.abs(blocker.cross))) {
                blocker = { cross }
            }
        })

        // Vector vuông góc (−dz, dx) trỏ về phía có cross < 0. Đối thủ ở phía
        // cross > 0 → né theo hướng (−dz, dx); ngược lại né theo hướng kia.
        if (blocker) memo.side = blocker.cross > 0 ? 1 : -1
    }

    const shift = memo.side * 4

    return {
        x: carrier.x + dx + (-dz / distance) * shift,
        z: carrier.z + dz + (dx / distance) * shift,
    }
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
        // Chỉ số Interceptions: đọc tình huống tốt → chạy cắt sớm hơn.
        const read = skill01(attr(item, 'interceptions'))
        const pace = (5.2 + (attr(item, 'sprintSpeed') / 80) * 2.2) * (1 + read * 0.08)
        const playerTime = Math.max(0, runDistance - 0.6) / (pace * INTERCEPT_SPEED)
        const ballTime = (length * projection) / ballSpeed
        const margin = playerTime - ballTime

        if (margin < 0 && (!best || margin < best.margin)) {
            best = { id: item.id, x: pointX, z: pointZ, margin }
        }
    })

    return best
}

// Hướng ngắm từ phím mũi tên (camera nhìn từ cạnh sân +X: lên = −X).
function aimFromKeys(keys) {
    const pressed = keys?.current || {}
    let x = 0
    let z = 0

    if (pressed.ArrowUp) x -= 1
    if (pressed.ArrowDown) x += 1
    if (pressed.ArrowLeft) z += 1
    if (pressed.ArrowRight) z -= 1

    const length = Math.hypot(x, z)

    return length ? { x: x / length, z: z / length } : null
}

// Người chơi đang giữ S (chuyền sệt): đồng đội sẽ nhận bóng bắt đầu chạy
// về phía người chuyền ngay từ lúc lấy lực (như FO4), không đợi bóng rời chân.
function updatePrePassRun(ctx, dt) {
    const { state, objects } = ctx
    const charge = state.charge

    state.prePassReceiver = null

    if (!charge || charge.action !== 'pass' || state.pendingPass) return

    const passer = objects[charge.playerId]
    const passerItem = getPlayer(ctx, charge.playerId)

    if (!passer || passerItem?.teamId !== 'blue' || state.restart) return

    const direction = aimFromKeys(ctx.keys)
    const target = findPassTarget(
        ctx,
        charge.playerId,
        'pass',
        direction ? { direction, power: charge.power } : null,
    )

    if (!target || target.outOfAim || target.item.role === 'GK') return

    const receiver = objects[target.item.id]
    const distance = receiver ? distance2D(receiver.position, passer.position) : 0

    if (!receiver || distance < 7 || distance > 28) return

    state.prePassReceiver = target.item.id

    // Tiến về phía người chuyền vài mét (không chạy hẳn tới chân người chuyền).
    const step = Math.min(4, distance - 6) / distance

    moveAIPlayer(
        ctx,
        target.item,
        {
            x: receiver.position.x + (passer.position.x - receiver.position.x) * step,
            z: receiver.position.z + (passer.position.z - receiver.position.z) * step,
        },
        1.2,
        dt,
    )
}

// ---- Phase 19 (sửa lỗi playtest): người nhận chạy ĐÓN bóng ----
// Trước đây người nhận chạy tới điểm đích rồi đứng chờ (chỉ đón đường bóng
// khi cách < 9m), nên hậu vệ bước lên trước cắt mất. Giờ người nhận chạy tới
// điểm SỚM NHẤT trên đường bóng mà mình tới kịp → luôn tiến về phía bóng.

const BALL_DECAY = 0.32          // bóng lăn chậm dần (1/s), xấp xỉ ma sát cỏ
const MEET_REACH = 0.9           // khống chế được bóng trong tầm này

// Vị trí bóng (trên mặt đất) sau t giây và độ cao lúc đó.
function predictBall(ballPosition, ballVelocity, t) {
    const travel = (1 - Math.exp(-BALL_DECAY * t)) / BALL_DECAY
    const height = ballPosition.y + ballVelocity.y * t - 4.9 * t * t

    return {
        x: ballPosition.x + ballVelocity.x * travel,
        z: ballPosition.z + ballVelocity.z * travel,
        y: Math.max(0.3, height),
    }
}

function meetingPoint(ctx, item, object, ballPosition, ballVelocity) {
    const speed = topSpeedOf(ctx, item) * 0.95
    let last = null

    for (let t = 0.05; t <= 2.6; t += 0.05) {
        const point = predictBall(ballPosition, ballVelocity, t)

        if (Math.abs(point.x) > FIELD.maxX || Math.abs(point.z) > FIELD.maxZ) break

        last = point

        // Bóng bổng còn cao: chưa khống chế được.
        if (point.y > 1.5) continue

        const run = Math.max(0, distance2D(object.position, point) - MEET_REACH)

        // Thêm 0.15s cho nhịp quay người / tăng tốc.
        if (run / speed + 0.15 <= t) return point
    }

    return last
}

// Chọc khe: chạy về điểm rơi phía trước (đón bóng trong khoảng trống), nhưng
// nếu bóng tới trước thì cắt vào đường bóng.
function throughRunTarget(ctx, item, object, ballPosition, ballVelocity, targetPosition) {
    const ballTime = distance2D(ballPosition, targetPosition) /
        Math.max(2, Math.hypot(ballVelocity.x, ballVelocity.z))
    const runTime = distance2D(object.position, targetPosition) / (topSpeedOf(ctx, item) * 0.95)

    if (runTime <= ballTime + 0.2) return targetPosition

    return meetingPoint(ctx, item, object, ballPosition, ballVelocity) || targetPosition
}

// Đồng đội chạy đến vị trí dự kiến nhận đường chuyền.
export function updateReceiverRun(ctx, dt) {
    const { state, objects } = ctx
    const pendingPass = state.pendingPass
    const ball = ctx.ballRef.current

    updatePrePassRun(ctx, dt)

    if (!pendingPass || !ball) return

    pendingPass.elapsed += dt

    const receiverObject = objects[pendingPass.receiverId]
    const receiverItem = getPlayer(ctx, pendingPass.receiverId)

    const ballPosition = ball.translation()
    const ballVelocity = ball.linvel()

    const ballSpeed = Math.hypot(ballVelocity.x, ballVelocity.y, ballVelocity.z)

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

    // Người nhận đang do người chơi điều khiển và người chơi đang bấm hướng:
    // để người chơi tự chạy (xem control.js, khóa phím sau khi đổi người).
    if (receiverItem.id === ctx.selectedId && state.userSteering) return

    const runTarget =
        pendingPass.action === 'through'
            ? throughRunTarget(ctx, receiverItem, receiverObject, ballPosition, ballVelocity, targetPosition)
            : meetingPoint(ctx, receiverItem, receiverObject, ballPosition, ballVelocity) || targetPosition

    moveAIPlayer(
        ctx,
        receiverItem,
        {
            x: clamp(runTarget.x, FIELD.minX + 1, FIELD.maxX - 1),
            z: clamp(runTarget.z, FIELD.minZ + 1, FIELD.maxZ - 1),
        },
        pendingPass.action === 'through' ? 1.65 : 1.45,
        dt,
    )
}

// Quyết định của cầu thủ AI đang giữ bóng: sút, chuyền hoặc dẫn bóng.

// Cầu thủ AI tắc bóng: người gần BÓNG nhất của đội không có bóng thử đoạt
// bóng. Bóng càng xa chân người rê càng dễ mất. Áp dụng cho cả hai đội
// (Phase 18): đồng đội do máy điều khiển của người chơi cũng tự tắc bóng;
// cầu thủ người chơi đang điều khiển thì phải tự bấm Space / Ctrl.
export function updateAISteal(ctx) {
    const { state, objects } = ctx
    const ownerId = state.possession
    const ownerItem = ownerId ? getPlayer(ctx, ownerId) : null
    const owner = ownerId ? objects[ownerId] : null
    const ball = ctx.ballRef.current

    if (
        !ownerItem ||
        !owner ||
        !ball ||
        state.restart ||
        state.keeperHands === ownerId
    ) {
        return
    }

    // Người vừa có bóng được một nhịp ổn định (không bị cướp lại ngay).
    if (state.carry?.id === ownerId && state.carry.time < 0.45) return

    const tacklingTeam = ownerItem.teamId === 'blue' ? 'red' : 'blue'
    const timerKey = tacklingTeam === 'red' ? 'aiAttemptCooldown' : 'aiAttemptCooldownBlue'

    // Đội người chơi: chỉ cầu thủ người chơi đang điều khiển mới tắc/xoạc
    // (bấm Space / A). Đồng đội máy không tự tắc — trừ khi máy đang đá thay
    // người chơi (không bấm phím 10 giây) hoặc trong mô phỏng.
    if (tacklingTeam === 'blue' && !ctx.autoPlay && !state.autoPilot) return

    if (state.timers[timerKey] > 0) return

    const ballPosition = ball.translation()

    const tackler = teamPlayers(ctx, tacklingTeam)
        .filter(
            (item) =>
                item.role !== 'GK' &&
                item.id !== ctx.selectedId &&
                !(state.pickupLocks[item.id] > 0) &&
                !isPlayerLocked(state, item.id),
        )
        .map((item) => ({ item, object: objects[item.id] }))
        .filter((entry) => entry.object)
        .map((entry) => ({
            ...entry,
            distance: distance2D(entry.object.position, ballPosition),
        }))
        .sort((a, b) => a.distance - b.distance)[0]

    if (!tackler) return

    // Xa hơn tầm tắc đứng: đôi khi máy xoạc bóng.
    if (tackler.distance >= 1.1) {
        tryAiSlide(ctx, tackler, ownerItem, owner, ballPosition, tacklingTeam, timerKey)
        return
    }

    // Aggression: cầu thủ càng máu lửa càng hay lao vào tắc (0.9–1.4s/lần).
    state.timers[timerKey] = clamp(1.65 - attr(tackler.item, 'aggression') * 0.008, 0.9, 1.4)

    const exposure = clamp(
        (distance2D(owner.position, ballPosition) - 0.7) / 1.0,
        0,
        1,
    )

    const tackleSkill =
        attr(tackler.item, 'standingTackle') - fatiguePenalty(state, tackler.item.id)
    const holdSkill =
        attr(ownerItem, 'ballControl') * 0.7 +
        attr(ownerItem, 'balance') * 0.3 -
        fatiguePenalty(state, ownerId)

    const chance = clamp(
        0.2 +
        exposure * 0.3 +
        (tackleSkill - holdSkill) * 0.005,
        0.06,
        0.5,
    )

    tackler.object.rotation.y = Math.atan2(
        ballPosition.x - tackler.object.position.x,
        ballPosition.z - tackler.object.position.z,
    )

    setPlayerAction(state, tackler.item.id, 'tackle')

    const ownerFacing = { x: Math.sin(owner.rotation.y), z: Math.cos(owner.rotation.y) }
    const toTacklerX = tackler.object.position.x - owner.position.x
    const toTacklerZ = tackler.object.position.z - owner.position.z
    const toTacklerLength = Math.hypot(toTacklerX, toTacklerZ) || 1
    const frontDot = (ownerFacing.x * toTacklerX + ownerFacing.z * toTacklerZ) / toTacklerLength
    const won = Math.random() < chance

    // Phase 20: trọng tài chấm pha vào bóng.
    if (judgeChallenge(ctx, { tacklerId: tackler.item.id, carrierId: ownerId, type: 'standing', won, frontDot })) return

    if (!won) return

    const label = tacklingTeam === 'blue' ? ctx.userTeamName : ctx.opponentName

    recordTeam(state, tacklingTeam, 'tackles')
    recordPlayer(state, tackler.item.id, 'tackles')

    // Đoạt bóng gọn, hoặc chỉ chọc được bóng văng ra.
    if (Math.random() > CLEAN_TACKLE_RATE) {
        pokeBallLoose(ctx, tackler.object, ownerId, tackler.item.id, tacklingTeam)
        ctx.onActionMessage(`${label} POKED THE BALL LOOSE`)
        return
    }

    state.pickupLocks[ownerId] = 0.4
    attachBallToPlayer(ctx, tackler.object, tackler.item.id)
    ctx.onActionMessage(`${label} WON THE BALL`)
}

// ---- Máy xoạc bóng ----
// Khi cách bóng 1.6–2.8m và người cầm bóng đang chạy, cầu thủ máy có thể
// xoạc (tỉ lệ theo Aggression). Thành công: bóng bật ra, người cầm bóng ngã.
// Hụt: người xoạc nằm sân ~0.7s. (Phạm lỗi khi xoạc thuộc Phase 20.)
function tryAiSlide(ctx, tackler, ownerItem, owner, ballPosition, tacklingTeam, timerKey) {
    const { state } = ctx

    if (tackler.distance < 1.6 || tackler.distance > 2.8) return

    const velocity = state.velocities[ownerItem.id] || { x: 0, z: 0 }

    if (Math.hypot(velocity.x, velocity.z) < 3) return

    // Mỗi lần chỉ "cân nhắc" xoạc theo nhịp cooldown.
    state.timers[timerKey] = 0.5

    // Phase 20: máy ngại xoạc từ sau lưng (dễ phạm lỗi, ăn thẻ).
    const ownerDir = { x: Math.sin(owner.rotation.y), z: Math.cos(owner.rotation.y) }
    const fromX = tackler.object.position.x - owner.position.x
    const fromZ = tackler.object.position.z - owner.position.z
    const fromBehind = (ownerDir.x * fromX + ownerDir.z * fromZ) / (Math.hypot(fromX, fromZ) || 1) < -0.4

    const willingness =
        (0.08 + skill01(attr(tackler.item, 'aggression')) * 0.14) * (fromBehind ? 0.3 : 1)

    if (Math.random() >= willingness) return

    state.timers[timerKey] = 1.6

    const tacklerObject = tackler.object

    tacklerObject.rotation.y = Math.atan2(
        ballPosition.x - tacklerObject.position.x,
        ballPosition.z - tacklerObject.position.z,
    )
    setPlayerAction(state, tackler.item.id, 'slide')

    const ownerFacing = { x: Math.sin(owner.rotation.y), z: Math.cos(owner.rotation.y) }
    const toTackler = {
        x: tacklerObject.position.x - owner.position.x,
        z: tacklerObject.position.z - owner.position.z,
    }
    const length = Math.hypot(toTackler.x, toTackler.z) || 1
    const frontDot = (ownerFacing.x * toTackler.x + ownerFacing.z * toTackler.z) / length

    const tackleSkill =
        attr(tackler.item, 'slidingTackle') - fatiguePenalty(state, tackler.item.id)
    const holdSkill =
        attr(ownerItem, 'ballControl') * 0.6 +
        attr(ownerItem, 'agility') * 0.4 -
        fatiguePenalty(state, ownerItem.id)

    const chance = clamp(
        0.42 + (tackleSkill - holdSkill) * 0.008 + frontDot * 0.12 - (tackler.distance - 1.6) * 0.12,
        0.1,
        0.75,
    )

    const won = Math.random() < chance

    if (judgeChallenge(ctx, { tacklerId: tackler.item.id, carrierId: ownerItem.id, type: 'slide', won, frontDot })) return

    if (!won) return

    const ball = ctx.ballRef.current
    const direction = {
        x: Math.sin(tacklerObject.rotation.y),
        z: Math.cos(tacklerObject.rotation.y),
    }

    ball.setLinvel({ x: direction.x * 5, y: 0.4, z: direction.z * 5 }, true)

    state.pickupLocks[ownerItem.id] = 0.9
    setPlayerAction(state, ownerItem.id, 'fallen')
    state.possession = null
    state.pendingPass = null
    state.lastTouchTeam = tacklingTeam
    state.lastToucherId = tackler.item.id

    recordTeam(state, tacklingTeam, 'tackles')
    recordPlayer(state, tackler.item.id, 'tackles')

    const label = tacklingTeam === 'blue' ? ctx.userTeamName : ctx.opponentName

    ctx.onActionMessage(`${label} SLIDING TACKLE!`)
}

// Cầu thủ máy đang xoạc: lao về phía trước trong 0.32s đầu (giống người chơi).
export function updateAiSlides(ctx, dt) {
    const { state, objects } = ctx

    ctx.players.forEach((item) => {
        if (item.id === ctx.selectedId) return

        const entry = state.playerStates[item.id]

        if (!entry || entry.state !== 'slide' || entry.time <= 0 || entry.elapsed > 0.32) return

        const object = objects[item.id]

        if (!object) return

        object.position.x += Math.sin(object.rotation.y) * 9 * dt
        object.position.z += Math.cos(object.rotation.y) * 9 * dt
        object.position.x = clamp(object.position.x, FIELD.minX, FIELD.maxX)
        object.position.z = clamp(object.position.z, FIELD.minZ, FIELD.maxZ)
    })
}
