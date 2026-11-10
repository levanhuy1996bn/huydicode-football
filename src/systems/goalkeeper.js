import { clamp, distance2D } from './constants'
import { facingFor, ownGoalSign } from './matchState'
import { attachBallToPlayer, teamPlayers } from './ball'
import { moveAIPlayer } from './movement'
import { recordPlayer, recordTeam } from './matchStats'

const KEEPER_REACH = 2.4

// `snapshot` = { ownerId, ownerItem } chụp ở đầu bước logic.
export function updateGoalkeeper(ctx, teamId, snapshot, dt) {
    const { state, objects } = ctx
    const ball = ctx.ballRef.current
    const keeperItem = teamPlayers(ctx, teamId).find((item) => item.role === 'GK')

    if (!ball || !keeperItem) return

    const keeper = objects[keeperItem.id]

    if (!keeper) return

    // Thủ môn đang giữ bóng thì đứng yên chờ phát bóng.
    if (state.possession === keeperItem.id) return

    const enemyTeamId = teamId === 'blue' ? 'red' : 'blue'
    const goalSign = ownGoalSign(state, teamId)
    const goalZ = goalSign * 50.5

    const ballPosition = ball.translation()
    const velocity = ball.linvel()
    const movingTowardGoal = velocity.z * goalSign > 0.5

    // Dự đoán điểm bóng tới khung thành.
    let predictedX = ballPosition.x

    if (movingTowardGoal) {
        const timeToGoal = (goalZ - ballPosition.z) / velocity.z

        if (timeToGoal > 0 && timeToGoal < 3) {
            predictedX += velocity.x * timeToGoal
        }
    }

    let targetX = clamp(predictedX, -7.2, 7.2)
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
            targetX = clamp(enemyCarrier.position.x, -8, 8)
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

    // ---- Cứu thua / bắt bóng ----
    const currentBall = ball.translation()
    const distanceToBall = distance2D(keeper.position, currentBall)
    const ballHeight = currentBall.y
    const insideKeeperArea = currentBall.z * goalSign > 39
    const ballSpeed = Math.hypot(velocity.x, velocity.y, velocity.z)
    const enemyOwnsBall = state.possession
        ? ctx.byId.get(state.possession)?.teamId === enemyTeamId
        : false

    const keeperRating = keeperItem.overall || 75
    const saveLabel = teamId === 'blue'
        ? 'BLUE GOALKEEPER'
        : `${ctx.opponentName} GOALKEEPER`

    if (!insideKeeperArea || ballHeight >= 2.8) return

    // Thủ môn vừa phát/đẩy bóng thì chưa được bắt lại.
    if (state.pickupLocks[keeperItem.id] > 0) return

    if (enemyOwnsBall && distanceToBall < 1.6) {
        // Thủ môn lao ra cướp bóng trong chân tiền đạo.
        attachBallToPlayer(ctx, keeper, keeperItem.id)
        state.timers.aiDecisionCooldown = 1.5
        ctx.onActionMessage(`${saveLabel} CLAIMS IT!`)
        return
    }

    if (state.possession || distanceToBall >= KEEPER_REACH) return

    // Chỉ bắt/cứu bóng do ĐỐI THỦ chạm cuối. Bóng của đồng đội (chuyền về,
    // bóng bật ra) thì thủ môn xử lý bằng chân như cầu thủ thường.
    if (state.lastTouchTeam !== enemyTeamId) return

    if (ballSpeed < 12) {
        // Bóng chậm: bắt gọn.
        attachBallToPlayer(ctx, keeper, keeperItem.id)
        state.timers.aiDecisionCooldown = 1.5
        return
    }

    // Bóng nhanh: tung xúc xắc MỘT lần cho mỗi cú đá.
    if (state.keeperResolvedKick[teamId] === state.kickId) return

    state.keeperResolvedKick[teamId] = state.kickId

    // Khoảng cách NGANG từ thủ môn tới đường bóng (điểm bóng cắt ngang vị
    // trí thủ môn), không phải khoảng cách lúc bóng vừa vào tầm với —
    // giá trị đó lúc nào cũng ~2.3m nên không phân biệt được cú sút hiểm.
    const timeToKeeper =
        Math.abs(velocity.z) > 0.5
            ? clamp((keeper.position.z - currentBall.z) / velocity.z, 0, 1)
            : 0
    const crossingX = currentBall.x + velocity.x * timeToKeeper
    const lateral = Math.abs(crossingX - keeper.position.x)

    const saveChance = clamp(
        0.5 +
        (keeperRating - 70) * 0.012 +
        (1.2 - lateral) * 0.25 -
        (ballSpeed - 20) * 0.02 -
        Math.max(0, ballHeight - 1.8) * 0.2,
        0.08,
        0.9,
    )

    if (Math.random() >= saveChance) {
        // Thủ môn đã bị đánh bại: không được "phanh" bóng bằng chân nữa
        // (trước đây hàm khống chế bóng tự do làm bóng chậm lại rồi
        // thủ môn bắt gọn, nên gần như không thể ghi bàn).
        state.pickupLocks[keeperItem.id] = 0.6
        return
    }

    // Cứu thua thành công: tính sút trúng đích cho đội sút, cứu thua cho thủ môn.
    recordTeam(state, enemyTeamId, 'onTarget')
    recordTeam(state, teamId, 'saves')
    recordPlayer(state, keeperItem.id, 'saves')

    if (ballSpeed < 20) {
        attachBallToPlayer(ctx, keeper, keeperItem.id)
        state.timers.aiDecisionCooldown = 1.5
        ctx.onActionMessage(`${saveLabel} SAVE!`)
        return
    }

    // Đẩy bóng ra: bật ngược và lệch sang một bên.
    const side =
        Math.sign(currentBall.x - keeper.position.x) ||
        (Math.random() < 0.5 ? -1 : 1)

    ball.setLinvel(
        {
            x: side * (4 + Math.random() * 4),
            y: 2 + Math.random() * 2,
            z: -velocity.z * 0.3,
        },
        true,
    )

    state.lastTouchTeam = teamId
    state.lastToucherId = keeperItem.id
    state.pendingPass = null
    state.kickId += 1
    state.pickupLocks[keeperItem.id] = 0.5

    ctx.onActionMessage(`${saveLabel} PARRIES IT!`)
}
