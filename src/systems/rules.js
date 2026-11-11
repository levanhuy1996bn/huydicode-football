import { FIELD, clamp } from './constants'
import {
    facingFor,
    homePosition,
    ownGoalSign,
    teamDefendingSide,
} from './matchState'
import { clearPlayerStates } from './playerState'
import { placeBall, teamPlayers } from './ball'
import { recordPlayer, recordTeam } from './matchStats'
import { attr } from './attributes'
import { BOX_DEPTH, BOX_HALF_WIDTH, PENALTY_SPOT } from './referee'

const otherTeam = (teamId) => (teamId === 'blue' ? 'red' : 'blue')

function placeAllAtHome(ctx) {
    const { state, objects } = ctx

    ctx.players.forEach((item) => {
        const object = objects[item.id]
        if (!object) return

        const home = homePosition(state, item)

        object.position.set(home.x, 0, home.z)
        object.rotation.y = facingFor(state, item.teamId)
    })
}

export function resetPositions(ctx, kickoffTeam = 'blue') {
    const { state, objects } = ctx

    placeAllAtHome(ctx)

    // Tự chọn cầu thủ tấn công gần giữa sân, không phụ thuộc ID cố định.
    const kickoffItem =
        ctx.players
            .filter((item) => item.teamId === kickoffTeam && item.role !== 'GK')
            .sort((a, b) => Math.abs(a.z ?? 0) - Math.abs(b.z ?? 0))[0] ||
        ctx.players.find((item) => item.teamId === kickoffTeam)

    const kickoffObject = kickoffItem ? objects[kickoffItem.id] : null

    if (kickoffObject) {
        kickoffObject.position.set(0, 0, ownGoalSign(state, kickoffTeam) * 1.2)
        kickoffObject.rotation.y = facingFor(state, kickoffTeam)
    }

    placeBall(ctx, 0, 0)

    state.possession = kickoffObject ? kickoffItem.id : null
    state.lastTouchTeam = kickoffTeam
    state.pendingPass = null
    state.charge = null
    state.windup = null
    state.keeperHands = null
    state.keeperPlans = {}
    state.shieldingId = null
    state.shieldAi = null
    state.duel = { key: null, time: 0, cooldown: 0 }
    state.duelSlow = {}
    state.restart = null
    state.pendingRestart = null
    state.offside = null
    state.wall = null
    state.whistle = null
    state.deadBall = false

    // BLUE giao bóng: người chơi điều khiển luôn cầu thủ giao bóng.
    if (kickoffTeam === 'blue' && kickoffObject) {
        ctx.onSelect(kickoffItem.id)
        ctx.selectedId = kickoffItem.id
    }

    state.timers.tackleCooldown = 0
    state.timers.aiAttemptCooldown = 0
    state.timers.aiAttemptCooldownBlue = 0
    state.timers.aiDecisionCooldown = 0.6

    clearPlayerStates(state)
}

// ---- Tình huống cố định (Phase 20) ----
// Mọi tình huống bóng chết dùng chung state.restart:
//   { type, teamId, playerId, ballX, ballZ, indirect, wall }
// type: 'throw-in' | 'corner' | 'goal-kick' | 'free-kick' | 'penalty'.
// Trong lúc chờ: bóng nằm yên tại chỗ (ném biên: trên tay), người đá chỉ
// xoay người chọn hướng, không ai được tranh bóng; đối phương phải đứng cách
// bóng 9.15m (ném biên 2m), phát bóng lên thì đối phương ra khỏi vòng cấm,
// phạt đền thì mọi người (trừ người đá và thủ môn) ra ngoài vòng cấm
// (xem enforceRestartSpacing). Trước đây phát bóng / phạt góc không có trạng
// thái chờ nên đối phương lao vào tranh bóng ngay (ghi chú playtest 3).
// Cầu thủ không còn bị "dịch chuyển" hết về vị trí đội hình mỗi lần bóng chết:
// chỉ người đá được đưa tới chỗ đặt bóng, những người khác tự chạy vào vị trí.

const RESTART_WAIT = {
    'throw-in': 1.2,
    corner: 2,
    'goal-kick': 1.8,
    'free-kick': 2.2,
    penalty: 2.6,
}

export const REFEREE_DISTANCE = 9.15

// Người đá phạt / đá phạt đền: chỉ số dứt điểm + sút xa tốt nhất.
function bestTaker(teamList, objects, key) {
    return teamList
        .filter((item) => item.role !== 'GK' && objects[item.id])
        .sort((a, b) => attr(b, key) + attr(b, 'shotPower') * 0.3 - (attr(a, key) + attr(a, 'shotPower') * 0.3))[0]
}

function nearestTo(teamList, objects, x, z, excludeGK = true) {
    return teamList
        .filter((item) => (!excludeGK || item.role !== 'GK') && objects[item.id])
        .sort(
            (a, b) =>
                Math.hypot(objects[a.id].position.x - x, objects[a.id].position.z - z) -
                Math.hypot(objects[b.id].position.x - x, objects[b.id].position.z - z),
        )[0]
}

export function restartAtSpot(ctx, teamId, restartType, x, z, extra = {}) {
    const { state, objects } = ctx

    const teamList = teamPlayers(ctx, teamId)
    const attackSign = -ownGoalSign(state, teamId)
    const goalZ = attackSign * FIELD.lineZ

    let ballX = clamp(x, FIELD.minX + 0.5, FIELD.maxX - 0.5)
    let ballZ = clamp(z, FIELD.minZ + 0.5, FIELD.maxZ - 0.5)
    let kicker = null

    if (restartType === 'goal-kick') {
        kicker = teamList.find((item) => item.role === 'GK')
    } else if (restartType === 'penalty') {
        kicker = bestTaker(teamList, objects, 'finishing')
        ballX = 0
        ballZ = attackSign * (FIELD.lineZ - PENALTY_SPOT)
    } else if (restartType === 'free-kick') {
        const goalDistance = Math.hypot(ballX, goalZ - ballZ)

        kicker = !extra.indirect && goalDistance < 30
            ? bestTaker(teamList, objects, 'longShots')
            : null
    }

    if (!kicker) kicker = nearestTo(teamList, objects, ballX, ballZ)
    if (!kicker) return

    const kickerObject = objects[kicker.id]
    if (!kickerObject) return

    let playerX = ballX
    let playerZ = ballZ
    let rotation = 0

    if (restartType === 'throw-in') {
        playerX = x > 0 ? FIELD.maxX - 1.15 : FIELD.minX + 1.15
        playerZ = clamp(z, FIELD.minZ + 2, FIELD.maxZ - 2)
        rotation = x > 0 ? -Math.PI / 2 : Math.PI / 2
    } else if (restartType === 'corner') {
        playerX = clamp(x, FIELD.minX + 1, FIELD.maxX - 1)
        playerZ = clamp(z, FIELD.minZ + 1, FIELD.maxZ - 1)
        rotation = z < 0 ? 0 : Math.PI
    } else if (restartType === 'goal-kick') {
        playerX = clamp(x, -5, 5)
        playerZ = ownGoalSign(state, teamId) * 47.5
        rotation = facingFor(state, teamId)
    } else {
        // Đá phạt / phạt đền: người đá đứng sau bóng 1m, quay về khung thành
        // (đá phạt xa thì quay về hướng tấn công).
        const toGoalX = 0 - ballX
        const toGoalZ = goalZ - ballZ
        const length = Math.hypot(toGoalX, toGoalZ) || 1
        const direct = restartType === 'penalty' || length < 34
        const dirX = direct ? toGoalX / length : 0
        const dirZ = direct ? toGoalZ / length : attackSign

        rotation = Math.atan2(dirX, dirZ)
        playerX = ballX - Math.sin(rotation) * 0.85
        playerZ = ballZ - Math.cos(rotation) * 0.85
    }

    kickerObject.position.set(playerX, 0, playerZ)
    kickerObject.rotation.y = rotation

    if (restartType === 'throw-in' || restartType === 'corner' || restartType === 'goal-kick') {
        ballX = playerX + Math.sin(rotation) * 0.85
        ballZ = playerZ + Math.cos(rotation) * 0.85
    }

    placeBall(ctx, ballX, ballZ)

    state.possession = kicker.id
    state.lastTouchTeam = teamId
    state.lastToucherId = kicker.id
    state.pendingPass = null
    state.charge = null
    state.windup = null
    state.keeperHands = null
    state.keeperPlans = {}
    state.shieldingId = null
    state.shieldAi = null
    state.duel = { key: null, time: 0, cooldown: 0 }
    state.duelSlow = {}
    state.offside = null
    state.wall = null
    state.restart = {
        type: restartType,
        teamId,
        playerId: kicker.id,
        ballX,
        ballZ,
        indirect: Boolean(extra.indirect),
        wall: null,
    }

    if (restartType === 'free-kick') buildWall(ctx, state.restart, goalZ)
    if (restartType === 'penalty') placeForPenalty(ctx, state.restart, attackSign)

    // Đẩy ngay những người đứng quá gần ra đúng cự ly.
    enforceRestartSpacing(ctx, 1, true)

    if (teamId === 'blue') {
        ctx.onSelect(kicker.id)
        ctx.selectedId = kicker.id
    }

    state.timers.tackleCooldown = 0
    state.timers.aiAttemptCooldown = 0
    state.timers.aiDecisionCooldown = RESTART_WAIT[restartType] ?? 1.5
    state.timers.goalCooldown = 2

    clearPlayerStates(state)

    const teamName = teamId === 'blue' ? ctx.userTeamName : ctx.opponentName

    if (restartType === 'throw-in') {
        ctx.onActionMessage(`${teamName} THROW-IN`)
    } else if (restartType === 'corner') {
        recordTeam(state, teamId, 'corners')
        ctx.onActionMessage(`${teamName} CORNER KICK`)
    } else if (restartType === 'goal-kick') {
        ctx.onActionMessage(`${teamName} GOAL KICK`)
    } else if (restartType === 'penalty') {
        ctx.onActionMessage(
            teamId === 'blue'
                ? `PENALTY · ${kicker.name.toUpperCase()} · AIM WITH ARROWS, D TO SHOOT`
                : `${teamName} PENALTY · ${kicker.name.toUpperCase()}`,
        )
    } else {
        ctx.onActionMessage(
            `${teamName} ${extra.indirect ? 'INDIRECT ' : ''}FREE KICK${teamId === 'blue' ? ' · S/W/A PASS · D SHOOT' : ''}`,
        )
    }
}

// Hàng rào: 2–4 cầu thủ đội phòng ngự đứng cách bóng 9.15m trên đường bóng
// tới giữa khung thành (chỉ khi đá phạt trong tầm sút).
function buildWall(ctx, restart, goalZ) {
    const { state, objects } = ctx
    const defending = restart.teamId === 'blue' ? 'red' : 'blue'
    const toGoalX = 0 - restart.ballX
    const toGoalZ = goalZ - restart.ballZ
    const distance = Math.hypot(toGoalX, toGoalZ)

    if (distance > 32 || distance < REFEREE_DISTANCE + 1) return

    const size = distance < 22 ? 4 : distance < 27 ? 3 : 2
    const dirX = toGoalX / distance
    const dirZ = toGoalZ / distance
    const centerX = restart.ballX + dirX * REFEREE_DISTANCE
    const centerZ = restart.ballZ + dirZ * REFEREE_DISTANCE
    const sideX = -dirZ
    const sideZ = dirX

    const members = teamPlayers(ctx, defending)
        .filter((item) => item.role !== 'GK' && objects[item.id] && item.id !== ctx.selectedId)
        .sort(
            (a, b) =>
                Math.hypot(objects[a.id].position.x - centerX, objects[a.id].position.z - centerZ) -
                Math.hypot(objects[b.id].position.x - centerX, objects[b.id].position.z - centerZ),
        )
        .slice(0, size)

    members.forEach((item, index) => {
        const offset = (index - (size - 1) / 2) * 0.75
        const object = objects[item.id]

        object.position.set(centerX + sideX * offset, 0, centerZ + sideZ * offset)
        object.rotation.y = Math.atan2(-dirX, -dirZ)
    })

    restart.wall = members.map((item) => item.id)
    // Cú đá tiếp theo (kickId + 1) có thể trúng hàng rào (referee.js).
    state.wall = { ids: restart.wall, kickId: state.kickId + 1, time: 0 }
}

// Phạt đền: thủ môn đội phòng ngự đứng trên vạch vôi giữa khung thành.
function placeForPenalty(ctx, restart, attackSign) {
    const { objects } = ctx
    const defending = restart.teamId === 'blue' ? 'red' : 'blue'
    const keeper = teamPlayers(ctx, defending).find((item) => item.role === 'GK')
    const object = keeper ? objects[keeper.id] : null

    if (!object) return

    object.position.set(0, 0, attackSign * (FIELD.lineZ - 0.5))
    object.rotation.y = Math.atan2(0, -attackSign)
}

// Giữ cự ly trong lúc chờ đá (gọi mỗi bước khi state.restart). `immediate`:
// đặt thẳng vào vị trí hợp lệ (lúc vừa thổi còi).
export function enforceRestartSpacing(ctx, dt, immediate = false) {
    const { state, objects } = ctx
    const restart = state.restart

    if (!restart) return

    const ball = { x: restart.ballX, z: restart.ballZ }
    const kickingSign = ownGoalSign(state, restart.teamId)
    const attackSign = -kickingSign
    const maxStep = immediate ? Infinity : 9 * dt
    const wall = restart.wall || []

    const moveTo = (object, x, z) => {
        const dx = x - object.position.x
        const dz = z - object.position.z
        const length = Math.hypot(dx, dz)

        if (length < 0.001) return

        const step = Math.min(length, maxStep)

        object.position.x += (dx / length) * step
        object.position.z += (dz / length) * step
    }

    ctx.players.forEach((item) => {
        const object = objects[item.id]

        if (!object || item.id === restart.playerId) return

        const opponent = item.teamId !== restart.teamId
        const position = object.position

        if (restart.type === 'penalty') {
            // Thủ môn đội phòng ngự: trên vạch vôi tới khi bóng được đá.
            if (opponent && item.role === 'GK') {
                position.z = attackSign * (FIELD.lineZ - 0.5)
                position.x = clamp(position.x, -2.5, 2.5)
                return
            }

            // Mọi người khác ra ngoài vòng cấm và ngoài vòng cung 9.15m.
            const depth = position.z * attackSign
            const edge = FIELD.lineZ - BOX_DEPTH - 1

            if (depth > edge && Math.abs(position.x) < BOX_HALF_WIDTH + 1) {
                moveTo(object, position.x, attackSign * edge)
            }

            pushOut(position, ball, REFEREE_DISTANCE, moveTo, object)
            return
        }

        if (!opponent) return

        if (restart.type === 'throw-in') {
            pushOut(position, ball, 2, moveTo, object)
            return
        }

        if (restart.type === 'goal-kick') {
            const depth = position.z * kickingSign
            const edge = FIELD.lineZ - BOX_DEPTH - 1

            if (depth > edge && Math.abs(position.x) < BOX_HALF_WIDTH + 1) {
                moveTo(object, position.x, kickingSign * edge)
            }

            return
        }

        // Phạt góc / đá phạt: cách bóng 9.15m (hàng rào đứng đúng cự ly).
        if (wall.includes(item.id)) return

        pushOut(position, ball, REFEREE_DISTANCE, moveTo, object)
    })
}

function pushOut(position, ball, radius, moveTo, object) {
    const dx = position.x - ball.x
    const dz = position.z - ball.z
    const distance = Math.hypot(dx, dz)

    if (distance >= radius) return

    const nx = distance > 0.01 ? dx / distance : 1
    const nz = distance > 0.01 ? dz / distance : 0
    const x = clamp(ball.x + nx * radius, FIELD.minX + 0.5, FIELD.maxX - 0.5)
    const z = clamp(ball.z + nz * radius, FIELD.minZ + 0.5, FIELD.maxZ - 0.5)

    moveTo(object, x, z)
}

// Kiểm tra bàn thắng và bóng ra ngoài. Trả về true nếu đã xử lý tình huống
// (bước logic hiện tại nên dừng lại).
export function checkGoalAndOut(ctx) {
    const { state } = ctx
    const ball = ctx.ballRef.current

    if (!ball || state.timers.goalCooldown > 0) return false

    const position = ball.translation()

    const insideGoalMouth =
        Math.abs(position.x) <= FIELD.goalHalfWidth &&
        position.y < FIELD.goalHeight

    if (Math.abs(position.z) > FIELD.lineZ && insideGoalMouth) {
        // Bóng đã qua vạch vôi thì là bàn thắng; việc cứu thua được
        // xử lý trong AI thủ môn trước khi bóng tới khung thành.
        const goalSide = Math.sign(position.z)
        const defendingTeam = teamDefendingSide(state, goalSide)
        const scoringTeam = otherTeam(defendingTeam)

        // Ghi công: người chạm bóng cuối. Nếu là cầu thủ đội phòng ngự → phản lưới.
        const scorer = state.lastToucherId
            ? ctx.byId.get(state.lastToucherId)
            : null
        const goalInfo = {
            scorerId: scorer?.id || null,
            scorerName: scorer?.name || null,
            ownGoal: Boolean(scorer && scorer.teamId !== scoringTeam),
            assistName: null,
        }

        // Thống kê: bàn thắng (không tính phản lưới) + kiến tạo.
        if (!goalInfo.ownGoal) {
            recordTeam(state, scoringTeam, 'onTarget')
            recordPlayer(state, goalInfo.scorerId, 'goals')

            const passerId = state.stats?.lastPasserId

            if (
                passerId &&
                passerId !== goalInfo.scorerId &&
                state.stats.lastPassTeam === scoringTeam
            ) {
                recordPlayer(state, passerId, 'assists')
                goalInfo.assistName = ctx.byId.get(passerId)?.name || null
            }
        }

        if (state.stats) {
            state.stats.lastPasserId = null
            state.stats.lastPassTeam = null
        }

        if (state.score) state.score[scoringTeam] += 1

        state.timers.goalCooldown = 4
        resetPositions(ctx, defendingTeam)
        ctx.onGoal(scoringTeam, goalInfo)

        const teamName = scoringTeam === 'blue' ? ctx.userTeamName : ctx.opponentName
        const credit = goalInfo.scorerName
            ? ` - ${goalInfo.scorerName.toUpperCase()}${goalInfo.ownGoal ? ' (OG)' : ''}`
            : ''

        ctx.onActionMessage(`GOAL! ${teamName}${credit}`)

        return true
    }

    // Bóng chỉ ra ngoài khi đã qua hẳn vạch biên.
    const outsideSide =
        Math.abs(position.x) > FIELD.lineX + FIELD.ballRadius &&
        Math.abs(position.z) <= FIELD.lineZ + FIELD.ballRadius

    const outsideEnd =
        Math.abs(position.z) > FIELD.lineZ + FIELD.ballRadius

    const fallenBall = position.y < -2

    if (!outsideSide && !outsideEnd && !fallenBall) return false

    const lastTouch = state.lastTouchTeam
    const oppositeTeam = otherTeam(lastTouch)

    if (fallenBall) {
        restartAtSpot(
            ctx,
            oppositeTeam,
            'throw-in',
            clamp(position.x, FIELD.minX, FIELD.maxX),
            clamp(position.z, FIELD.minZ, FIELD.maxZ),
        )
    } else if (outsideSide) {
        restartAtSpot(ctx, oppositeTeam, 'throw-in', position.x, position.z)
    } else {
        const endSide = Math.sign(position.z)
        const defendingTeam = teamDefendingSide(state, endSide)

        if (lastTouch === defendingTeam) {
            restartAtSpot(
                ctx,
                oppositeTeam,
                'corner',
                clamp(
                    position.x < 0 ? FIELD.minX : FIELD.maxX,
                    FIELD.minX + 1,
                    FIELD.maxX - 1,
                ),
                endSide < 0 ? FIELD.minZ + 0.8 : FIELD.maxZ - 0.8,
            )
        } else {
            restartAtSpot(
                ctx,
                defendingTeam,
                'goal-kick',
                clamp(position.x, -4, 4),
                endSide * 47.5,
            )
        }
    }

    return true
}
