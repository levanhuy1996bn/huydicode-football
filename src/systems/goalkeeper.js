import { FIELD, clamp, distance2D } from './constants'
import { facingFor, ownGoalSign } from './matchState'
import { attachBallToPlayer, curlOffset, teamPlayers } from './ball'
import { moveAIPlayer } from './movement'
import { recordPlayer, recordTeam } from './matchStats'
import { isPlayerLocked, setPlayerAction } from './playerState'
import { attr, skill01 } from './attributes'
import { fatiguePenalty } from './stamina'

// ---- Phase 16: thủ môn ----
// Khi có cú sút/bóng nhanh hướng về khung thành, thủ môn lập "kế hoạch"
// MỘT lần cho mỗi cú đá (state.keeperPlans[team]):
//   - dự đoán điểm bóng cắt ngang vị trí thủ môn (x, độ cao, thời gian tới);
//   - quyết định đứng bắt / cúi hốt / bay người (thấp, giữa, cao) sang trái/phải;
//   - tung xúc xắc cứu thua ngay lúc đó (tầm với, phản xạ, tốc độ, độ cao, chỉ số);
//   - sau thời gian phản xạ thì lao người (di chuyển ngang + animation bay người).
// Khi bóng tới mặt phẳng thủ môn: thành công → bắt dính / đẩy ra / đẩy qua xà;
// thất bại → thủ môn bay người hụt, không chạm được bóng.

const STAND_REACH = 0.9        // với được bóng không cần bay người (m)
const DIVE_BODY_REACH = 1.45   // từ hông tới đầu ngón tay khi nằm ngang (m)
const DIVE_SPEED = 6.5         // tốc độ lao người ngang (m/s)
const DIVE_PUSH_TIME = 0.32    // thời gian bật người (s)
const SLOW_BALL = 12           // bóng chậm hơn thế thì bắt gọn kiểu thường

const DIVE_DURATION = 1.15

function keeperOf(ctx, teamId) {
    const item = teamPlayers(ctx, teamId).find((player) => player.role === 'GK')

    return item ? { item, object: ctx.objects[item.id] } : null
}

// Bắt bóng bằng tay: giữ bóng, chờ phát (throw/punt).
function keeperCatch(ctx, keeper, keeperItem) {
    const { state } = ctx

    attachBallToPlayer(ctx, keeper, keeperItem.id)
    state.keeperHands = keeperItem.id
    state.keeperHoldTime = 0
    state.charge = null
    state.timers.aiDecisionCooldown = keeperItem.teamId === 'blue' ? 0 : 1.6

    // Thủ môn BLUE bắt bóng: người chơi điều khiển việc phát bóng
    // (S/W ném tay, A/D phát bóng dài). Quá 5 giây không bấm → AI tự phát.
    if (keeperItem.teamId === 'blue') {
        ctx.onSelect(keeperItem.id)
        ctx.selectedId = keeperItem.id
    }
}

// Dự đoán và lập kế hoạch cho cú đá hiện tại.
function planSave(ctx, teamId, keeper, keeperItem) {
    const { state } = ctx
    const ball = ctx.ballRef.current
    const position = ball.translation()
    const velocity = ball.linvel()
    const goalSign = ownGoalSign(state, teamId)

    // Chỉ cứu bóng do đối phương đá (không bắt bóng đồng đội chuyền về).
    if (state.lastTouchTeam === teamId) return null

    // Bóng phải đang bay về phía khung thành nhà.
    if (velocity.z * goalSign < 4) return null

    const timeToKeeper = (keeper.position.z - position.z) / velocity.z
    const timeToGoal = (goalSign * FIELD.lineZ - position.z) / velocity.z

    if (timeToKeeper <= 0 || timeToKeeper > 2.5) return null

    // Bóng xoáy (ZD / CD): cộng độ cong còn lại vào điểm dự đoán.
    const curl = state.curl && state.curl.kickId === state.kickId ? state.curl : null
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
    // Độ lệch thêm so với đường thẳng theo vận tốc hiện tại.
    const bendAt = (t) => (curl ? curlOffset(curl, curl.travelled || 0, horizontalSpeed * t) : 0)

    const crossX = position.x + velocity.x * timeToKeeper + bendAt(timeToKeeper)
    const crossY = Math.max(
        0.2,
        position.y + velocity.y * timeToKeeper - 4.9 * timeToKeeper * timeToKeeper,
    )
    const goalX = position.x + velocity.x * timeToGoal + bendAt(timeToGoal)
    const goalY = position.y + velocity.y * timeToGoal - 4.9 * timeToGoal * timeToGoal
    const onTarget =
        Math.abs(goalX) <= FIELD.goalHalfWidth + 0.2 && goalY < FIELD.goalHeight + 0.1

    const lateral = crossX - keeper.position.x
    const distance = Math.abs(lateral)

    // Bóng đi ra ngoài và cách xa thủ môn: để bóng đi.
    if (!onTarget && distance > STAND_REACH) {
        return { kickId: state.kickId, type: 'leave', resolved: true }
    }

    // Phase 19: Reflexes → thời gian phản xạ, Diving → tầm bay người,
    // trung bình Diving/Reflexes → tỉ lệ cứu thua; mệt thì kém đi.
    const tired = fatiguePenalty(state, keeperItem.id)
    const reflexes = attr(keeperItem, 'reflexes') - tired
    const diving = attr(keeperItem, 'diving') - tired
    const rating = (reflexes + diving) / 2
    const reaction = clamp(0.24 - (reflexes - 70) * 0.006, 0.1, 0.3)
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
    const timeToDive = timeToKeeper - reaction
    const maxReach =
        STAND_REACH + DIVE_SPEED * clamp(timeToDive, 0, DIVE_PUSH_TIME) + 0.8 +
        (diving - 70) * 0.025

    const standing = distance <= STAND_REACH
    // Đang nằm sân sau pha bay người trước: không kịp phản ứng.
    const recovering = isPlayerLocked(state, keeperItem.id)
    // Bóng bay cao hơn tầm với khi bật nhảy (~2.75m, ví dụ cú sút lốp) thì chịu.
    const reachable =
        !recovering && crossY < 2.75 && (standing || (distance <= maxReach && timeToDive > 0.04))

    let chance = 0

    if (reachable && standing) {
        // Bóng đi thẳng vào người: gần như chắc chắn cản được.
        chance = clamp(
            0.9 + (rating - 70) * 0.005 - Math.max(0, speed - 26) * 0.02,
            0.65,
            0.97,
        )
    } else if (reachable) {
        // Phase 18: tính theo tỉ lệ tầm với đã dùng (0 = sát người, 1 = vươn
        // hết cỡ), thay vì mét tuyệt đối — trước đây bay người gần như luôn
        // thất bại (≈15%) khi AI sút có chủ đích hơn.
        const reachRatio = clamp(
            (distance - STAND_REACH) / Math.max(0.1, maxReach - STAND_REACH),
            0,
            1,
        )

        chance = clamp(
            0.84 +
            (rating - 70) * 0.01 -
            reachRatio * 0.45 -
            Math.max(0, speed - 22) * 0.015 -
            Math.max(0, crossY - 1.9) * 0.25 -
            (timeToDive < 0.18 ? 0.15 : 0),
            0.1,
            0.9,
        )
    }

    // Phase 20: phạt đền — thủ môn đoán hướng từ trước (trái / phải / đứng
    // giữa). Đoán đúng mới có cơ hội cứu, sút sát góc / lên cao thì khó hơn.
    const penalty = state.penaltyKick && state.penaltyKick.kickId === state.kickId
    let penaltyGuess = null

    if (penalty) {
        const shotSide = distance < 0.9 ? 0 : Math.sign(lateral)

        penaltyGuess = state.penaltyKick.guess
        chance = penaltyGuess === shotSide
            ? clamp(
                0.6 + (rating - 70) * 0.01 - Math.max(0, distance - 2.2) * 0.35 - Math.max(0, crossY - 1.5) * 0.3,
                0.08,
                0.8,
            )
            : 0
    }

    // Bóng xoáy (ZD / CD) khó đọc hơn: đổi hướng sau khi thủ môn đã bật người.
    if (curl && !penalty) chance = Math.max(0, chance - 0.15)

    const success = Math.random() < chance
    const side = penalty && penaltyGuess ? penaltyGuess : Math.sign(lateral) || 1
    const height = crossY < 0.6 ? 'low' : crossY > 1.65 ? 'high' : 'mid'

    let type
    if (standing) {
        type = height === 'low' ? 'scoop' : height === 'high' ? 'catchHigh' : 'catch'
    } else {
        type = height === 'low' ? 'diveLow' : height === 'high' ? 'diveHigh' : 'diveMid'
    }

    // Điểm hông thủ môn cần tới: thành công → tay chạm bóng,
    // thất bại → bay người hụt (thiếu 0.4–1.0m) hoặc, nếu bóng quá nhanh
    // với thủ môn kém, đôi khi đoán sai hướng.
    let targetX = keeper.position.x

    if (!standing) {
        const travel = Math.max(0, distance - DIVE_BODY_REACH)
        const shortfall = success ? 0 : 0.4 + Math.random() * 0.6

        targetX = keeper.position.x + side * Math.max(0, travel - shortfall)
    }

    if (penalty && penaltyGuess !== null && penaltyGuess !== (distance < 0.9 ? 0 : Math.sign(lateral))) {
        // Đoán sai: bay người hẳn sang hướng đã chọn (hoặc đứng yên).
        targetX = keeper.position.x + penaltyGuess * 1.8
    }

    const wrongWay =
        !penalty &&
        !success && !standing && speed > 24 && Math.random() < clamp(0.25 - (rating - 70) * 0.015, 0.03, 0.25)

    return {
        kickId: state.kickId,
        type,
        side: wrongWay ? -side : side,
        targetX: wrongWay ? keeper.position.x - side * 0.8 : targetX,
        success,
        onTarget,
        speed,
        crossY,
        // Cứu thua thất bại: phản xạ chậm hơn một nhịp (bay người muộn).
        startAt: success ? reaction : reaction + 0.12,
        reachable,
        elapsed: 0,
        expires: timeToKeeper + 0.8,
        started: false,
        resolved: false,
    }
}

// Thực hiện cứu thua khi bóng tới mặt phẳng thủ môn.
function resolveSave(ctx, teamId, keeper, keeperItem, plan, saveLabel) {
    const { state } = ctx
    const ball = ctx.ballRef.current
    const velocity = ball.linvel()
    const position = ball.translation()
    const enemyTeamId = teamId === 'blue' ? 'red' : 'blue'
    const goalSign = ownGoalSign(state, teamId)

    plan.resolved = true

    // Bóng đổi hướng giữa đường (chạm người khác) và ra khỏi tầm với.
    const reachNow = distance2D(position, keeper.position)

    if (!plan.success || reachNow > 3.4) {
        // Bay người hụt: không cho thủ môn "phanh" bóng bằng logic đỡ bóng.
        state.pickupLocks[keeperItem.id] = 0.8
        return
    }

    recordTeam(state, enemyTeamId, 'onTarget')
    recordTeam(state, teamId, 'saves')
    recordPlayer(state, keeperItem.id, 'saves')

    const standing = ['catch', 'catchHigh', 'scoop'].includes(plan.type)
    // Handling (Phase 19): thủ môn bắt dính tốt bắt được bóng mạnh hơn
    // (±4 m/s), kém thì hay phải đẩy ra.
    const grip = (attr(keeperItem, 'handling') - 70) * 0.2
    const canHold =
        (standing && plan.speed < 25 + grip) ||
        (plan.type === 'diveMid' && plan.speed < 17 + grip) ||
        (plan.type === 'diveLow' && plan.speed < 14 + grip)

    if (canHold) {
        keeperCatch(ctx, keeper, keeperItem)
        ctx.onActionMessage(
            teamId === 'blue'
                ? `${saveLabel} SAVE! · ARROWS WALK · S/W THROW · A/D KICK`
                : `${saveLabel} SAVE!`,
        )
        return
    }

    state.lastTouchTeam = teamId
    state.lastToucherId = keeperItem.id
    state.pendingPass = null
    state.kickId += 1
    state.pickupLocks[keeperItem.id] = 0.6

    // Bóng cao: đẩy qua xà ngang (ra phạt góc).
    if (plan.type === 'diveHigh' || plan.type === 'catchHigh') {
        if (Math.random() < 0.6) {
            ball.setLinvel(
                { x: velocity.x * 0.3, y: 6.5, z: velocity.z * 0.45 },
                true,
            )
            ctx.onActionMessage(`${saveLabel} TIPS IT OVER!`)
            return
        }
    }

    // Đẩy bóng ra hai bên, bật ngược ra khỏi khung thành.
    const side = plan.side || Math.sign(position.x - keeper.position.x) || 1

    ball.setLinvel(
        {
            x: side * (5 + Math.random() * 4),
            y: 1.5 + Math.random() * 2.5,
            z: -goalSign * (2 + Math.random() * 3),
        },
        true,
    )

    ctx.onActionMessage(`${saveLabel} PARRIES IT!`)
}

// `snapshot` = { ownerId, ownerItem } chụp ở đầu bước logic.
export function updateGoalkeeper(ctx, teamId, snapshot, dt) {
    const { state, objects } = ctx
    const ball = ctx.ballRef.current
    const found = keeperOf(ctx, teamId)

    if (!ball || !found?.object) return

    const keeperItem = found.item
    const keeper = found.object

    // Thủ môn đang giữ bóng thì đứng yên chờ phát bóng.
    if (state.possession === keeperItem.id) {
        if (state.keeperHands === keeperItem.id) {
            state.keeperHoldTime = (state.keeperHoldTime || 0) + dt
        }

        return
    }

    const enemyTeamId = teamId === 'blue' ? 'red' : 'blue'
    const goalSign = ownGoalSign(state, teamId)
    const goalZ = goalSign * 50.5
    const saveLabel = teamId === 'blue'
        ? `${ctx.userTeamName} GOALKEEPER`
        : `${ctx.opponentName} GOALKEEPER`

    if (!state.keeperPlans) state.keeperPlans = {}

    // ---- Kế hoạch cứu thua cho cú đá mới ----
    let plan = state.keeperPlans[teamId]

    if (!state.possession && (!plan || plan.kickId !== state.kickId)) {
        const next = planSave(ctx, teamId, keeper, keeperItem)

        if (next) {
            state.keeperPlans[teamId] = next
            plan = next
        }
    }

    // Có người khống chế được bóng (cản phá, cắt bóng) → bỏ kế hoạch.
    if (plan && !plan.resolved && state.possession) plan.resolved = true

    if (plan && !plan.resolved && plan.kickId === state.kickId) {
        plan.elapsed += dt

        // Hết phản xạ: bắt đầu bay người / bắt bóng.
        if (!plan.started && plan.elapsed >= plan.startAt) {
            plan.started = true

            const duration = plan.type.startsWith('dive') ? DIVE_DURATION : 0.6
            setPlayerAction(state, keeperItem.id, plan.type, duration, {
                side: localSide(keeper, plan.side),
            })
        }

        // Lao người ngang về điểm dự tính.
        if (plan.started && plan.type.startsWith('dive')) {
            const remaining = plan.targetX - keeper.position.x

            if (Math.abs(remaining) > 0.02) {
                const step = Math.min(Math.abs(remaining), DIVE_SPEED * dt)
                keeper.position.x += Math.sign(remaining) * step
            }
        }

        // Bóng tới mặt phẳng thủ môn → phân xử.
        const current = ball.translation()
        const reached = (current.z - keeper.position.z) * goalSign >= -0.5

        if (reached && current.y < 3.2) {
            resolveSave(ctx, teamId, keeper, keeperItem, plan, saveLabel)
        } else if (plan.elapsed > plan.expires) {
            plan.resolved = true
        }

        return
    }

    // ---- Chọn vị trí ----
    const ballPosition = ball.translation()
    const velocity = ball.linvel()
    const movingTowardGoal = velocity.z * goalSign > 0.5

    let predictedX = ballPosition.x

    if (movingTowardGoal) {
        const timeToGoal = (goalZ - ballPosition.z) / velocity.z

        if (timeToGoal > 0 && timeToGoal < 3) {
            predictedX += velocity.x * timeToGoal
        }
    }

    // Đứng trên đường phân giác giữa bóng và tâm khung thành. Positioning
    // kém (Phase 19) thì đứng lệch về phía tâm khung thành hơn (che góc kém).
    const coverage = 0.6 + skill01(attr(keeperItem, 'positioning')) * 0.25
    let targetX = clamp(predictedX * coverage, -3.2, 3.2)
    let targetZ =
        goalZ - goalSign * clamp((goalZ - ballPosition.z) * goalSign * 0.2, 0, 5)

    const { ownerId, ownerItem } = snapshot
    const enemyCarrier =
        ownerItem?.teamId === enemyTeamId ? objects[ownerId] : null

    let rushingOut = false

    if (enemyCarrier) {
        const distanceToGoal = Math.abs(enemyCarrier.position.z - goalZ)
        const distanceToKeeper = distance2D(enemyCarrier.position, keeper.position)

        if (distanceToGoal < 19 && distanceToKeeper < 23) {
            rushingOut = true
            targetX = clamp(enemyCarrier.position.x * 0.8, -6, 6)
            targetZ = goalSign > 0
                ? Math.min(goalZ - 1, enemyCarrier.position.z + 4)
                : Math.max(goalZ + 1, enemyCarrier.position.z - 4)
        }
    }

    targetZ = goalSign > 0 ? clamp(targetZ, 42, 51) : clamp(targetZ, -51, -42)

    keeper.rotation.y = facingFor(state, teamId)

    moveAIPlayer(
        ctx,
        keeperItem,
        { x: targetX, z: targetZ },
        movingTowardGoal || rushingOut ? 2.1 : 1.35,
        dt,
    )

    // ---- Bóng chậm / bóng trong chân tiền đạo ----
    const current = ball.translation()
    const distanceToBall = distance2D(keeper.position, current)
    const insideKeeperArea = current.z * goalSign > 39
    const ballSpeed = Math.hypot(velocity.x, velocity.y, velocity.z)
    const enemyOwnsBall = state.possession
        ? ctx.byId.get(state.possession)?.teamId === enemyTeamId
        : false

    if (!insideKeeperArea || current.y >= 2.8) return
    if (state.pickupLocks[keeperItem.id] > 0) return
    if (isPlayerLocked(state, keeperItem.id)) return

    if (enemyOwnsBall && distanceToBall < 1.6) {
        // Lao ra ôm bóng trong chân tiền đạo.
        setPlayerAction(state, keeperItem.id, 'diveLow', 0.9, {
            side: localSide(keeper, Math.sign(current.x - keeper.position.x) || 1),
        })
        keeperCatch(ctx, keeper, keeperItem)
        ctx.onActionMessage(`${saveLabel} CLAIMS IT!`)
        return
    }

    if (
        !state.possession &&
        distanceToBall < 2 &&
        ballSpeed < SLOW_BALL &&
        state.lastTouchTeam === enemyTeamId
    ) {
        setPlayerAction(state, keeperItem.id, current.y < 0.6 ? 'scoop' : 'catch', 0.6)
        keeperCatch(ctx, keeper, keeperItem)
    }
}

// Hướng bay người theo hệ trục của thủ môn (+1 = sang phải theo trục local +X).
function localSide(keeper, worldSide) {
    // Trục local +X của object quay rotation.y = θ là (cos θ, 0, −sin θ).
    return Math.sign(Math.cos(keeper.rotation.y) * worldSide) || 1
}
